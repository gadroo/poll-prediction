from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from models import get_db, User, PasswordResetToken, OTP
from schemas import UserCreate, UserLogin, Token, UserResponse, ForgotPasswordRequest, ResetPasswordRequest, OTPRequest, OTPVerifyRequest, OTPResetPasswordRequest
from auth.auth import verify_password, get_password_hash, create_access_token
from auth.dependencies import get_current_user_required
from services.email import generate_otp_code, send_otp_email

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        hashed_password=hashed_password
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except IntegrityError as e:
        db.rollback()
        error_msg = str(e.orig)
        if 'username' in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(new_user.id)})
    
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(new_user)
    )

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    # Find user
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user:
        # User doesn't exist - suggest sign up
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email. Please sign up first."
        )
    
    if not verify_password(user_data.password, user.hashed_password):
        # User exists but wrong password
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user_required)
):
    """Get current user information"""
    return UserResponse.model_validate(current_user)

@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Delete the current user's account permanently.
    - Polls created by the user will be deleted (CASCADE)
    - Bookmarks by the user will be deleted (CASCADE)
    - Votes by the user will be preserved as anonymous (SET NULL + add session ID)
    - Comments by the user will be preserved as anonymous (SET NULL)
    """
    from models import Vote
    import uuid
    
    try:
        # Convert user's votes to anonymous votes by adding a dummy session ID
        # This preserves vote counts while removing user identification
        user_votes = db.query(Vote).filter(Vote.user_id == current_user.id).all()
        for vote in user_votes:
            vote.client_session_id = f"deleted_user_{uuid.uuid4()}"
        
        # Commit the vote updates before deleting user
        db.commit()
        
        # Now delete the user
        # - Polls will be CASCADE deleted (ondelete="CASCADE")
        # - Bookmarks will be CASCADE deleted (ondelete="CASCADE")
        # - Votes will have user_id set to NULL (ondelete="SET NULL") - already have session_id
        # - Comments will have user_id set to NULL (ondelete="SET NULL")
        db.delete(current_user)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        print(f"Error deleting account: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete account: {str(e)}"
        )

@router.post("/send-otp")
async def send_otp(request: OTPRequest, db: Session = Depends(get_db)):
    """Send OTP code for password reset"""
    from datetime import datetime, timezone, timedelta
    
    # Check if user exists
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        # Don't reveal if email exists or not for security
        return {"message": "If the email exists, a verification code has been sent"}
    
    # Generate OTP code
    otp_code = generate_otp_code(6)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)  # OTP expires in 10 minutes
    
    # Invalidate any existing OTPs for this user and purpose
    db.query(OTP).filter(
        OTP.user_id == user.id,
        OTP.purpose == "password_reset"
    ).delete()
    
    # Create new OTP
    otp = OTP(
        user_id=user.id,
        email=request.email,
        code=otp_code,
        purpose="password_reset",
        expires_at=expires_at
    )
    
    db.add(otp)
    db.commit()
    
    # Send OTP via email
    email_sent = send_otp_email(request.email, otp_code, "password_reset")
    
    if not email_sent:
        # If email fails, still return success message for security
        print(f"OTP for {request.email}: {otp_code}")
    
    return {"message": "If the email exists, a verification code has been sent"}

@router.post("/verify-otp")
async def verify_otp(request: OTPVerifyRequest, db: Session = Depends(get_db)):
    """Verify OTP code"""
    # Find the OTP
    otp = db.query(OTP).filter(
        OTP.email == request.email,
        OTP.code == request.code,
        OTP.purpose == "password_reset"
    ).first()
    
    if not otp or not otp.is_valid():
        # Increment attempts if OTP exists but is invalid
        if otp:
            max_attempts_reached = otp.increment_attempts()
            db.commit()
            if max_attempts_reached:
                return {"message": "Too many failed attempts. Please request a new code.", "valid": False}
        
        return {"message": "Invalid or expired verification code", "valid": False}
    
    return {"message": "Verification code is valid", "valid": True}

@router.post("/reset-password-otp")
async def reset_password_otp(request: OTPResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using OTP code"""
    # Find the OTP
    otp = db.query(OTP).filter(
        OTP.email == request.email,
        OTP.code == request.code,
        OTP.purpose == "password_reset"
    ).first()
    
    if not otp or not otp.is_valid():
        # Increment attempts if OTP exists but is invalid
        if otp:
            max_attempts_reached = otp.increment_attempts()
            db.commit()
            if max_attempts_reached:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Too many failed attempts. Please request a new code."
                )
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )
    
    # Get the user
    user = db.query(User).filter(User.id == otp.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )
    
    # Update password
    user.hashed_password = get_password_hash(request.new_password)
    
    # Mark OTP as used
    otp.used = True
    
    db.commit()
    
    return {"message": "Password has been reset successfully"}


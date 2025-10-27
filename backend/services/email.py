import os
import random
import string
from datetime import datetime, timezone, timedelta

# Optional SendGrid import - only import if available
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False
    print("WARNING: SendGrid not available. Email functionality will be disabled.")

def generate_otp_code(length=6):
    """Generate a random OTP code"""
    return ''.join(random.choices(string.digits, k=length))

def send_otp_email(email: str, otp_code: str, purpose: str = "password_reset"):
    """Send OTP code via email using SendGrid"""
    
    # Check if SendGrid is available
    if not SENDGRID_AVAILABLE:
        print(f"WARNING: SendGrid not available. OTP for {email}: {otp_code}")
        return False
    
    # Get SendGrid API key from environment
    sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
    
    if not sendgrid_api_key:
        print(f"WARNING: SENDGRID_API_KEY not set. OTP for {email}: {otp_code}")
        return False
    
    # Create email content based on purpose
    if purpose == "password_reset":
        subject = "Reset your QuickPoll password"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset your password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">QuickPoll</h1>
                <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Password Reset</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                <h2 style="color: #333; margin-top: 0;">Reset your password</h2>
                <p>You requested to reset your password for your QuickPoll account. Use the verification code below:</p>
                
                <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <h1 style="color: #667eea; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">{otp_code}</h1>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                    <strong>This code will expire in 10 minutes.</strong><br>
                    If you didn't request this password reset, please ignore this email.
                </p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e9ecef; text-align: center;">
                    <p style="color: #999; font-size: 12px; margin: 0;">
                        This is an automated message from QuickPoll. Please do not reply to this email.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        QuickPoll - Password Reset
        
        You requested to reset your password for your QuickPoll account.
        
        Your verification code is: {otp_code}
        
        This code will expire in 10 minutes.
        
        If you didn't request this password reset, please ignore this email.
        
        ---
        This is an automated message from QuickPoll.
        """
    
    else:
        # Generic OTP email
        subject = "Your QuickPoll verification code"
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verification Code</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">QuickPoll</h1>
                <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Verification Code</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
                <h2 style="color: #333; margin-top: 0;">Your verification code</h2>
                <p>Use the code below to complete your verification:</p>
                
                <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                    <h1 style="color: #667eea; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">{otp_code}</h1>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                    <strong>This code will expire in 10 minutes.</strong>
                </p>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
        QuickPoll - Verification Code
        
        Your verification code is: {otp_code}
        
        This code will expire in 10 minutes.
        
        ---
        This is an automated message from QuickPoll.
        """
    
    try:
        # Create SendGrid message
        message = Mail(
            from_email="noreply@quickpoll.app",  # This should be a verified sender
            to_emails=email,
            subject=subject,
            html_content=html_content,
            plain_text_content=text_content
        )
        
        # Send email
        sg = SendGridAPIClient(api_key=sendgrid_api_key)
        response = sg.send(message)
        
        print(f"OTP email sent to {email}: {response.status_code}")
        return True
        
    except Exception as e:
        print(f"Failed to send OTP email to {email}: {e}")
        return False

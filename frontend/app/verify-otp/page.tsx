'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import api from '@/lib/api';

function OTPVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !code) {
      toast.error('Please enter your email and verification code');
      return;
    }

    if (code.length !== 6) {
      toast.error('Verification code must be 6 digits');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/api/auth/verify-otp', { email, code });
      if (response.data.valid) {
        setIsVerified(true);
        toast.success('Code verified! You can now reset your password');
      } else {
        toast.error(response.data.message || 'Invalid verification code');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to verify code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      toast.error('Email is required');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/api/auth/send-otp', { email });
      setTimeLeft(600); // Reset timer
      toast.success('New verification code sent');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Code verified!</CardTitle>
            <CardDescription>
              You can now reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Your verification code has been confirmed. Click below to set your new password.
              </p>
              <Link href={`/reset-password-otp?email=${encodeURIComponent(email)}&code=${code}`}>
                <Button className="w-full">
                  Reset password
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Invalid request</CardTitle>
            <CardDescription>
              No email address provided
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please start the password reset process from the login page.
              </p>
              <Link href="/forgot-password">
                <Button className="w-full">
                  Start password reset
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <Card>
        <CardHeader>
          <CardTitle>Enter verification code</CardTitle>
          <CardDescription>
            We sent a 6-digit code to {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium">
                Verification Code
              </label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
              />
              {timeLeft > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  Code expires in {formatTime(timeLeft)}
                </p>
              )}
              {timeLeft === 0 && (
                <p className="text-sm text-red-500 text-center">
                  Code has expired. Please request a new one.
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Button type="submit" className="w-full" disabled={isLoading || timeLeft === 0}>
                {isLoading ? 'Verifying...' : 'Verify code'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleResendCode}
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Resend code'}
              </Button>
            </div>
          </form>
          
          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Remember your password? </span>
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OTPVerificationPage() {
  return (
    <Suspense fallback={
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>Please wait while we load the verification form</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <OTPVerificationForm />
    </Suspense>
  );
}

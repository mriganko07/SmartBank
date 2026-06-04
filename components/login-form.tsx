'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { login as apiLogin, verifyOtp, resendOtp } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export function LoginForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(30);
  const { login } = useAuth();
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step !== 2) return;
    setResendSeconds(30);
    timerRef.current = setInterval(() => {
      setResendSeconds((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step]);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDevOtpHint('');
    setIsLoading(true);
    try {
      const response = await apiLogin(email, password);
      if (response.error) {
        setError(response.error);
        return;
      }
      if (response.data?.user_id) {
        setUserId(response.data.user_id);
        setStep(2);
        setOtp('');
        const devOtp = (response.data as { dev_otp?: string }).dev_otp;
        if (devOtp) setDevOtpHint(`Dev mode OTP: ${devOtp}`);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Enter the full 6-digit code');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const response = await verifyOtp(userId, otp);
      if (response.error) {
        setError(response.error);
        return;
      }
      if (response.data) {
        const { access_token, user } = response.data as {
          access_token: string;
          user: {
            id: string;
            email: string;
            full_name: string;
            account_number: string;
            ifsc_code?: string;
            bank_name?: string;
            branch_name?: string;
            account_type: string;
          };
        };
        login(user, access_token);
        router.push('/dashboard');
      }
    } catch {
      setError('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendSeconds > 0) return;
    setError('');
    const response = await resendOtp(userId);
    if (response.error) {
      setError(response.error);
      return;
    }
    setResendSeconds(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSeconds((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">
              SB
            </div>
            <span className="font-bold text-lg text-foreground">SmartBank</span>
          </div>
          <CardTitle className="text-2xl">
            {step === 1 ? 'Welcome back' : 'Verify your identity'}
          </CardTitle>
          <CardDescription>
            {step === 1
              ? 'Sign in to your account to access your banking dashboard'
              : 'Enter the 6-digit code sent to your registered phone'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-3 mb-4">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-10 bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? 'Sending code...' : 'Continue'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {devOtpHint && (
                <p className="text-sm text-center text-amber-700 bg-amber-500/10 rounded-lg p-2">
                  {devOtpHint}
                </p>
              )}
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                type="submit"
                className="w-full h-10 bg-primary hover:bg-primary/90"
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? 'Verifying...' : 'Verify & sign in'}
              </Button>
              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendSeconds > 0}
                  className="text-primary font-medium disabled:text-muted-foreground disabled:cursor-not-allowed"
                >
                  {resendSeconds > 0
                    ? `Resend OTP in ${resendSeconds}s`
                    : 'Resend OTP'}
                </button>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setError('');
                }}
              >
                Back to login
              </Button>
            </form>
          )}

          {step === 1 && (
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Don&apos;t have an account? </span>
              <Link href="/register" className="text-primary hover:underline font-medium">
                Create account
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

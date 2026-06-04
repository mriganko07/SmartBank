import { LoginForm } from '@/components/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - SmartBank',
  description: 'Sign in to your SmartBank account',
};

export default function LoginPage() {
  return <LoginForm />;
}

import { RegisterForm } from '@/components/register-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account - SmartBank',
  description: 'Create a new SmartBank account',
};

export default function RegisterPage() {
  return <RegisterForm />;
}

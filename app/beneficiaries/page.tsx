'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { BeneficiaryManager } from '@/components/beneficiary-manager';
import { Users } from 'lucide-react';

export default function BeneficiariesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <DashboardNav />
      <main className="min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <Users className="h-8 w-8" />
            Beneficiaries
          </h1>
          <p className="text-muted-foreground mb-8">
            Manage saved payees for NEFT, IMPS, and RTGS transfers.
          </p>
          <BeneficiaryManager />
        </div>
      </main>
    </>
  );
}

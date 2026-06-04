'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { DashboardStats } from '@/components/dashboard-stats';
import { TransactionList } from '@/components/transaction-list';
import { NewTransactionForm } from '@/components/new-transaction-form';
import { SpendingLimitWidget } from '@/components/spending-limit-widget';
import type { Metadata } from 'next';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardNav />
      <main className="min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-8">
            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">
                Monitor your transactions and fraud detection in real-time
              </p>
            </div>

            {user?.ifsc_code && (
              <p className="text-sm text-muted-foreground rounded-lg border border-border px-4 py-2">
                <span className="font-medium text-foreground">Your banking details:</span>{' '}
                {user.bank_name} · IFSC <span className="font-mono">{user.ifsc_code}</span> · Account{' '}
                <span className="font-mono">{user.account_number}</span>
              </p>
            )}

            {/* Stats */}
            <DashboardStats />

            <SpendingLimitWidget />

            {/* Actions and Transactions */}
            <div className="space-y-4">
              <NewTransactionForm />
              <TransactionList />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

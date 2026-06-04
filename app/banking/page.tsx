'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { BankingProducts } from '@/components/banking-products';
import { Card, CardContent } from '@/components/ui/card';
import { Landmark } from 'lucide-react';

export default function BankingPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
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
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Landmark className="h-8 w-8" />
              Banking products
            </h1>
            <p className="text-muted-foreground mt-1">
              Fixed deposits and loans linked to your SmartBank account
            </p>
          </div>

          {user?.account_number && (
            <Card className="border-primary/20">
              <CardContent className="pt-6 text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Account:</span>{' '}
                  <span className="font-mono font-medium">{user.account_number}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">IFSC:</span>{' '}
                  <span className="font-mono">{user.ifsc_code || '—'}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Bank:</span> {user.bank_name || 'SmartBank India'}
                </p>
              </CardContent>
            </Card>
          )}

          <BankingProducts />
        </div>
      </main>
    </>
  );
}

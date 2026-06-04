'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DisputeModal } from '@/components/dispute-modal';
import { ExportModal } from '@/components/export-modal';
import { getTransactions } from '@/lib/api';
import { TrendingUp, Download } from 'lucide-react';
import { TransactionRow, type TransactionItem } from '@/components/transaction-row';
import { parseApiUtcDate } from '@/lib/datetime';

function canDispute(tx: TransactionItem) {
  if (tx.direction !== 'outgoing') return false;
  const dayMs = 24 * 60 * 60 * 1000;
  const isOld = Date.now() - parseApiUtcDate(tx.created_at).getTime() > dayMs;
  return tx.is_flagged || isOld;
}

export default function TransactionsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(true);
  const [error, setError] = useState('');
  const [disputeTxId, setDisputeTxId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchTransactions = useCallback(async () => {
    const response = await getTransactions();
    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setTransactions(response.data.data || []);
      setError('');
    }
    setIsLoadingTx(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchTransactions();
  }, [isAuthenticated, fetchTransactions]);

  useRealtimeRefresh(() => {
    if (isAuthenticated) return fetchTransactions();
  }, 10000);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
      </div>
    );
  }

  return (
    <>
      <DashboardNav />
      <main className="min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-8 w-8" />
                Transaction History
              </h1>
              <p className="text-muted-foreground">
                All your transactions with fraud detection status
              </p>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Transactions ({transactions.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTx && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
                  {error}
                </div>
              )}

              {!isLoadingTx && !error && transactions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No transactions yet.</p>
                </div>
              )}

              {!isLoadingTx && !error && transactions.length > 0 && (
                <div className="overflow-x-auto">
                    <div className="space-y-3">
                      {transactions.map((tx) => (
                        <div
                          key={`${tx.id}-${tx.direction}`}
                          className="rounded-lg border border-border overflow-hidden"
                        >
                          <TransactionRow tx={tx} />
                          {canDispute(tx) && (
                            <div className="px-3 pb-3 flex justify-end border-t border-border bg-secondary/20">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDisputeTxId(tx.id)}
                              >
                                Dispute
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {disputeTxId && (
        <DisputeModal
          open={!!disputeTxId}
          onOpenChange={(o) => !o && setDisputeTxId(null)}
          transactionId={disputeTxId}
          onSuccess={fetchTransactions}
        />
      )}
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
    </>
  );
}

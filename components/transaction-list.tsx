'use client';

import { useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTransactions } from '@/lib/api';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
import { TrendingUp } from 'lucide-react';
import { TransactionRow, type TransactionItem } from '@/components/transaction-row';

export function TransactionList() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTransactions = useCallback(async () => {
    const response = await getTransactions();
    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setTransactions(response.data.data || []);
      setError('');
    }
    setIsLoading(false);
  }, []);

  useRealtimeRefresh(fetchTransactions, 10000);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Recent Transactions
          <span className="text-xs font-normal text-muted-foreground ml-auto">
            Live · refreshes every 10s
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && transactions.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
            {error}
          </div>
        )}

        {!isLoading && !error && transactions.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No transactions yet</p>
          </div>
        )}

        {!error && transactions.length > 0 && (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((tx) => (
              <TransactionRow key={`${tx.id}-${tx.direction}`} tx={tx} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

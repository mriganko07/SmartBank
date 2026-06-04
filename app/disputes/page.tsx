'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
import { useRouter } from 'next/navigation';
import { formatTransactionWhen } from '@/lib/datetime';
import { useAuth } from '@/lib/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDisputes, type DisputeInfo } from '@/lib/api';
import { Scale } from 'lucide-react';

function statusBadge(status: string) {
  if (status === 'resolved')
    return <Badge className="bg-green-500/20 text-green-700">Resolved</Badge>;
  if (status === 'under_review')
    return <Badge className="bg-blue-500/20 text-blue-700">Under review</Badge>;
  return <Badge className="bg-amber-500/20 text-amber-800">Open</Badge>;
}

export default function DisputesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [disputes, setDisputes] = useState<DisputeInfo[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  const fetchDisputes = useCallback(async () => {
    const res = await getDisputes();
    if (res.error) setError(res.error);
    else {
      setDisputes(res.data?.data || []);
      setError('');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchDisputes();
  }, [isAuthenticated, fetchDisputes]);

  useRealtimeRefresh(() => {
    if (isAuthenticated) return fetchDisputes();
  }, 15000);

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
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-6">
            <Scale className="h-8 w-8" />
            My disputes
          </h1>
          {error && <p className="text-destructive text-sm mb-4">{error}</p>}
          <div className="space-y-4">
            {disputes.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No disputes filed yet.
                </CardContent>
              </Card>
            )}
            {disputes.map((d) => (
              <Card key={d.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base font-mono">{d.id.slice(-8)}</CardTitle>
                  {statusBadge(d.status)}
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>
                    <span className="text-muted-foreground">Transaction:</span>{' '}
                    <span className="font-mono">{d.transaction_id.slice(-12)}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Reason:</span> {d.reason.replace('_', ' ')}
                  </p>
                  <p>{d.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTransactionWhen(d.created_at)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

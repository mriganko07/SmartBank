'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { formatTransactionWhen } from '@/lib/datetime';
import { Laptop, Smartphone, Monitor } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  getSessions,
  revokeSession,
  revokeAllSessions,
  sessionHeartbeat,
  type SessionInfo,
} from '@/lib/api';
import { authFetcher } from '@/lib/swr-fetcher';

export default function SessionsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const { data, mutate, isLoading: loadingSessions } = useSWR<{ data: SessionInfo[] }>(
    isAuthenticated ? '/auth/sessions/' : null,
    authFetcher,
    { refreshInterval: 60000 }
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    sessionHeartbeat();
    const id = setInterval(() => sessionHeartbeat(), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  const sessions = data?.data || [];

  const deviceIcon = (name: string) => {
    if (name === 'Mobile') return <Smartphone className="h-5 w-5" />;
    if (name === 'Tablet') return <Monitor className="h-5 w-5" />;
    return <Laptop className="h-5 w-5" />;
  };

  const handleRevoke = async (sessionId: string) => {
    await revokeSession(sessionId);
    mutate();
  };

  const handleRevokeAll = async () => {
    await revokeAllSessions();
    mutate();
  };

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
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Active sessions</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Devices where you are signed in
              </p>
            </div>
            <Button variant="outline" onClick={handleRevokeAll}>
              Log out all other devices
            </Button>
          </div>

          <div className="space-y-4">
            {loadingSessions && (
              <p className="text-muted-foreground text-sm">Loading sessions...</p>
            )}
            {sessions.map((s) => (
              <Card key={s.session_id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary">{deviceIcon(s.device_name)}</div>
                      <div>
                        <CardTitle className="text-base">
                          {s.device_name} · {s.browser}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{s.os}</p>
                      </div>
                    </div>
                    {s.is_current ? (
                      <Badge className="bg-green-500/20 text-green-700">Current session</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevoke(s.session_id)}
                      >
                        Log out
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>{s.location_city} · {s.ip_address}</p>
                  <p>
                    Last active {formatTransactionWhen(s.last_active)}
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

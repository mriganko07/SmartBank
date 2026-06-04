'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getAlerts, markAlertAsRead, markAllAlertsRead } from '@/lib/api';
import { formatTransactionWhen } from '@/lib/datetime';
import { AlertCircle, CheckCircle, Bell } from 'lucide-react';

interface Alert {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  transaction_id?: string;
}

export default function AlertsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const fetchAlerts = useCallback(async () => {
    const response = await getAlerts();
    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      setAlerts(response.data.data || []);
      setError('');
    }
    setIsLoadingAlerts(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) fetchAlerts();
  }, [isAuthenticated, fetchAlerts]);

  useRealtimeRefresh(() => {
    if (isAuthenticated) return fetchAlerts();
  }, 10000);

  const handleMarkAsRead = async (alertId: string) => {
    const res = await markAlertAsRead(alertId);
    if (!res.error) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
      );
    }
  };

  const handleMarkAllRead = async () => {
    const res = await markAllAlertsRead();
    if (!res.error) {
      setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true })));
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'fraud':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'suspicious':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };

  const getAlertColor = (type: string, isRead: boolean) => {
    if (isRead) return 'bg-secondary/50';
    
    switch (type) {
      case 'fraud':
        return 'bg-destructive/5 border-destructive/20';
      case 'suspicious':
        return 'bg-yellow-500/5 border-yellow-500/20';
      default:
        return 'bg-blue-500/5 border-blue-500/20';
    }
  };

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

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <>
      <DashboardNav />
      <main className="min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                  <Bell className="h-8 w-8" />
                  Alerts & Notifications
                </h1>
                <p className="text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount !== 1 ? 's' : ''}` : 'All alerts read'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <Button size="sm" variant="outline" onClick={handleMarkAllRead}>
                    Mark all read
                  </Button>
                )}
                <Link
                  href="/alerts/preferences"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Preferences
                </Link>
              </div>
            </div>

            {/* Alerts List */}
            <div className="space-y-3">
              {isLoadingAlerts && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
                  {error}
                </div>
              )}

              {!isLoadingAlerts && !error && alerts.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground">No alerts yet. Your account is safe!</p>
                  </CardContent>
                </Card>
              )}

              {!isLoadingAlerts && !error && alerts.length > 0 && alerts.map((alert) => (
                <Card
                  key={alert.id}
                  className={`border transition-colors ${getAlertColor(alert.alert_type, alert.is_read)}`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {getAlertIcon(alert.alert_type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{alert.title}</h3>
                            {!alert.is_read && (
                              <Badge className="bg-primary text-primary-foreground">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatTransactionWhen(alert.created_at)}
                          </p>
                        </div>
                      </div>
                      {!alert.is_read && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsRead(alert.id)}
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

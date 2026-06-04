'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { AdminFraudMonitor } from '@/components/admin-fraud-monitor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, TrendingUp } from 'lucide-react';

export default function AdminPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
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
              <div className="flex items-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
              </div>
              <p className="text-muted-foreground">
                System-wide fraud detection monitoring and management
              </p>
            </div>

            {/* Admin Info */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Admin Dashboard</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Welcome, {user?.full_name}. Monitor all high-risk transactions and system alerts below.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    Active Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">12</p>
                  <p className="text-xs text-muted-foreground mt-1">in last 24 hours</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    System Health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">98.5%</p>
                  <p className="text-xs text-muted-foreground mt-1">uptime</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    ML Model Accuracy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">94.2%</p>
                  <p className="text-xs text-muted-foreground mt-1">fraud detection rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Fraud Monitoring */}
            <AdminFraudMonitor />

            {/* System Information */}
            <Card className="border-muted">
              <CardHeader>
                <CardTitle className="text-lg">System Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Database</h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-muted-foreground">Type:</span>{' '}
                        <span className="font-medium">MongoDB (Cloud Atlas)</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Collections:</span>{' '}
                        <span className="font-medium">6 (users, transactions, fraud_logs, alerts, analytics)</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Backup Frequency:</span>{' '}
                        <span className="font-medium">Daily</span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-3">ML Services</h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-muted-foreground">Model Type:</span>{' '}
                        <span className="font-medium">Ensemble (Logistic Regression + Random Forest)</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Training:</span>{' '}
                        <span className="font-medium">Daily at 2:00 AM UTC</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Features:</span>{' '}
                        <span className="font-medium">Amount, Category, Location, Frequency</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}

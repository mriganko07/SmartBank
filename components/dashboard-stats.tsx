'use client';

import { useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import { getDashboardStats } from '@/lib/api';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
import { TrendingUp, AlertTriangle, DollarSign, AlertCircle } from 'lucide-react';

interface DashboardData {
  total_transactions: number;
  flagged_transactions: number;
  total_amount: number;
  flagged_amount: number;
  average_fraud_score: number;
  unread_alerts: number;
  fraud_rate: number;
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const response = await getDashboardStats();
    if (response.data) {
      setStats(response.data as DashboardData);
    }
    setIsLoading(false);
  }, []);

  useRealtimeRefresh(fetchStats, 10000);

  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-24 mb-4" />
            <div className="h-6 bg-muted rounded w-32" />
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: 'Total Transactions',
      value: stats.total_transactions,
      icon: TrendingUp,
      color: 'bg-blue-500/10 text-blue-600',
    },
    {
      label: 'Flagged Transactions',
      value: stats.flagged_transactions,
      subtext: `${stats.fraud_rate.toFixed(1)}% fraud rate`,
      icon: AlertTriangle,
      color: 'bg-yellow-500/10 text-yellow-600',
    },
    {
      label: 'Total Spending',
      value: `₹${stats.total_amount.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-500/10 text-green-600',
    },
    {
      label: 'Unread Alerts',
      value: stats.unread_alerts,
      icon: AlertCircle,
      color: 'bg-red-500/10 text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, idx) => (
        <Card key={idx} className="p-6 border border-border hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
              <p className="text-2xl font-bold mt-2">{stat.value}</p>
              {stat.subtext && (
                <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
              )}
            </div>
            <div
              className={`h-10 w-10 rounded-lg ${stat.color} flex items-center justify-center flex-shrink-0`}
            >
              <stat.icon className="h-5 w-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

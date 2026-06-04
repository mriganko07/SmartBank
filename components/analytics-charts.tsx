'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAnalyticsData } from '@/lib/api';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';

interface AnalyticsData {
  date: string;
  total_transactions: number;
  fraudulent_transactions: number;
  total_amount: number;
  flagged_amount: number;
  fraud_rate: number;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

interface AnalyticsSummary {
  total_transactions: number;
  flagged_transactions: number;
  total_amount: number;
  fraud_rate: number;
}

export function AnalyticsCharts() {
  const [data, setData] = useState<AnalyticsData[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    const response = await getAnalyticsData(30);

    if (response.error) {
      setError(response.error);
    } else if (response.data) {
      const payload = response.data as {
        data: AnalyticsData[];
        summary?: AnalyticsSummary;
      };
      const sortedData = (payload.data || [])
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        )
        .map((item) => ({
          ...item,
          date: format(new Date(item.date + 'T12:00:00'), 'MMM dd'),
        }));
      setData(sortedData);
      setSummary(payload.summary || null);
      setError('');
    }
    setIsLoading(false);
  }, []);

  useRealtimeRefresh(fetchData, 15000);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-4">
              <div className="h-5 bg-muted rounded w-32" />
            </CardHeader>
            <CardContent className="h-80 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
        {error}
      </div>
    );
  }

  const totalTransactions =
    summary?.total_transactions ??
    data.reduce((sum, d) => sum + d.total_transactions, 0);
  const totalFraudulent =
    summary?.flagged_transactions ??
    data.reduce((sum, d) => sum + d.fraudulent_transactions, 0);
  const avgFraudRate =
    summary?.fraud_rate?.toFixed(1) ??
    (totalTransactions > 0
      ? ((totalFraudulent / totalTransactions) * 100).toFixed(1)
      : '0');

  if (totalTransactions === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            No outgoing transactions yet. Send a transfer from the dashboard to see analytics.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pieData = [
    { name: 'Normal', value: Math.max(0, totalTransactions - totalFraudulent) },
    { name: 'Flagged', value: totalFraudulent },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Transaction Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction Trends</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Daily transaction volume and fraud detected
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total_transactions"
                stroke="#3b82f6"
                name="Total Transactions"
                dot={false}
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="fraudulent_transactions"
                stroke="#ef4444"
                name="Fraudulent"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Amount and Fraud Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction Amount</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Daily spending and flagged amounts
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                  formatter={(value) => `₹${(value as number).toFixed(2)}`}
                />
                <Legend />
                <Bar dataKey="total_amount" fill="#3b82f6" name="Total Amount" />
                <Bar dataKey="flagged_amount" fill="#ef4444" name="Flagged Amount" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fraud Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fraud Distribution</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {totalTransactions} total transactions, {avgFraudRate}% fraud rate
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => 
                    `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Fraud Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fraud Rate Trend</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Percentage of transactions flagged as fraudulent
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" label={{ value: 'Fraud Rate (%)', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'var(--foreground)' }}
                formatter={(value) => `${(value as number).toFixed(2)}%`}
              />
              <Line
                type="monotone"
                dataKey="fraud_rate"
                stroke="#f59e0b"
                name="Fraud Rate (%)"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

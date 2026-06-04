'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authFetcher } from '@/lib/swr-fetcher';
import type { CategorySpend } from '@/lib/api';

const CATEGORY_COLORS: Record<string, string> = {
  food: '#1D9E75',
  grocery: '#1D9E75',
  shopping: '#378ADD',
  crypto: '#D85A30',
  cryptocurrency: '#D85A30',
  travel: '#BA7517',
  gambling: '#E24B4A',
  wire_transfer: '#7F77DD',
  cash_advance: '#D4537E',
  other: '#888780',
};

function colorFor(category: string) {
  const key = category.toLowerCase().replace(/\s+/g, '_');
  return CATEGORY_COLORS[key] || '#888780';
}

export function CategoryBreakdown() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const { data, isLoading } = useSWR<{ data: CategorySpend[] }>(
    `/analytics/categories/?period=${period}`,
    authFetcher,
    { refreshInterval: 15000 }
  );

  const items = data?.data || [];
  const chartData = items.map((i) => ({
    name: i.category,
    value: i.total_amount,
    fill: colorFor(i.category),
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Spending by category</CardTitle>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={period === 'weekly' ? 'default' : 'outline'}
            onClick={() => setPeriod('weekly')}
          >
            Weekly
          </Button>
          <Button
            size="sm"
            variant={period === 'monthly' ? 'default' : 'outline'}
            onClick={() => setPeriod('monthly')}
          >
            Monthly
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
        )}
        {!isLoading && items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No transactions in this period
          </p>
        )}
        {items.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <ul className="mt-6 space-y-3">
              {items.map((item) => (
                <li
                  key={item.category}
                  className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ background: colorFor(item.category) }}
                    />
                    <span className="font-medium">{item.category}</span>
                    <span className="text-muted-foreground">
                      ₹{item.total_amount.toLocaleString()} ({item.percent_of_total}%)
                    </span>
                  </div>
                  <span
                    className={`flex items-center gap-1 ${
                      item.change_percent > 0 ? 'text-red-600' : 'text-green-600'
                    }`}
                  >
                    {item.change_percent > 0 ? (
                      <ArrowUp className="h-3 w-3" />
                    ) : (
                      <ArrowDown className="h-3 w-3" />
                    )}
                    {Math.abs(item.change_percent)}%
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTransactions } from '@/lib/api';
import { AlertCircle, TrendingDown, TrendingUp } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  merchant_category: string;
  fraud_score: number;
  is_flagged: boolean;
  status: string;
  created_at: string;
}

export function AdminFraudMonitor() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      const response = await getTransactions();
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        // Get all transactions and filter high-risk ones
        const allTx = response.data.data || [];
        const highRisk = allTx.filter((tx: Transaction) => tx.is_flagged);
        setTransactions(highRisk.slice(0, 20));
      }
      setIsLoading(false);
    };

    fetchTransactions();
  }, []);

  const stats = {
    totalFlagged: transactions.length,
    highRisk: transactions.filter(t => t.fraud_score > 0.7).length,
    mediumRisk: transactions.filter(t => t.fraud_score > 0.4 && t.fraud_score <= 0.7).length,
    avgScore: transactions.length > 0 
      ? (transactions.reduce((sum, t) => sum + t.fraud_score, 0) / transactions.length * 100).toFixed(1)
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* Risk Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Flagged</p>
                <p className="text-2xl font-bold mt-1">{stats.totalFlagged}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Risk</p>
                <p className="text-2xl font-bold mt-1 text-destructive">{stats.highRisk}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Medium Risk</p>
                <p className="text-2xl font-bold mt-1 text-yellow-600">{stats.mediumRisk}</p>
              </div>
              <TrendingDown className="h-6 w-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                <p className="text-2xl font-bold mt-1">{stats.avgScore}%</p>
              </div>
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* High Risk Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">High Risk Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
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
              <p className="text-muted-foreground">No high-risk transactions detected</p>
            </div>
          )}

          {!isLoading && !error && transactions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Transaction</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-right py-3 px-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-center py-3 px-3 font-medium text-muted-foreground">Risk Score</th>
                    <th className="text-left py-3 px-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-secondary/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">{tx.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">{tx.merchant_category}</td>
                      <td className="py-3 px-3 text-right font-semibold">${tx.amount.toFixed(2)}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-destructive/20 to-destructive/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-destructive">
                              {(tx.fraud_score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {tx.fraud_score > 0.7 ? (
                          <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30">
                            Critical
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30">
                            Warning
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

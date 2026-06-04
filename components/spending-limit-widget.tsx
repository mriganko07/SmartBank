'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { SetLimitModal } from '@/components/set-limit-modal';
import { authFetcher } from '@/lib/swr-fetcher';
import type { SpendingSummary } from '@/lib/api';

function barColor(percent: number) {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 70) return 'bg-amber-500';
  return 'bg-green-500';
}

function LimitBar({
  label,
  block,
}: {
  label: string;
  block: { limit: number | null; spent: number; percent: number };
}) {
  if (!block.limit) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          ₹{block.spent.toLocaleString()} spent · No limit set
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          ₹{block.spent.toLocaleString()} of ₹{block.limit.toLocaleString()} spent
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full transition-all ${barColor(block.percent)}`}
          style={{ width: `${Math.min(block.percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function SpendingLimitWidget() {
  const [modalOpen, setModalOpen] = useState(false);
  const { data, mutate } = useSWR<SpendingSummary>(
    '/analytics/spending-summary/',
    authFetcher,
    { refreshInterval: 10000 }
  );

  if (!data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Loading spending limits...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Spending limits</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setModalOpen(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <LimitBar label="Weekly" block={data.weekly} />
          <LimitBar label="Monthly" block={data.monthly} />
        </CardContent>
      </Card>
      <SetLimitModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        weekly={data.weekly.limit}
        monthly={data.monthly.limit}
        onSaved={() => mutate()}
      />
    </>
  );
}

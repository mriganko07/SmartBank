'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateSpendingLimits } from '@/lib/api';
import { toast } from 'sonner';

interface SetLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekly?: number | null;
  monthly?: number | null;
  onSaved: () => void;
}

export function SetLimitModal({
  open,
  onOpenChange,
  weekly,
  monthly,
  onSaved,
}: SetLimitModalProps) {
  const [w, setW] = useState(weekly?.toString() ?? '');
  const [m, setM] = useState(monthly?.toString() ?? '');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const res = await updateSpendingLimits(
      w === '' ? null : parseFloat(w),
      m === '' ? null : parseFloat(m)
    );
    setLoading(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Spending limits updated');
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set spending limits</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Weekly limit (₹)</label>
            <Input
              type="number"
              min="0"
              placeholder="No limit"
              value={w}
              onChange={(e) => setW(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Monthly limit (₹)</label>
            <Input
              type="number"
              min="0"
              placeholder="No limit"
              value={m}
              onChange={(e) => setM(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save limits'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

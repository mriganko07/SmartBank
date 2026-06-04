'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createDispute } from '@/lib/api';
import { CheckCircle } from 'lucide-react';

const REASONS = [
  { value: 'unauthorized', label: 'Unauthorized transaction' },
  { value: 'duplicate', label: 'Duplicate charge' },
  { value: 'wrong_amount', label: 'Wrong amount' },
  { value: 'other', label: 'Other' },
];

interface DisputeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  onSuccess?: () => void;
}

export function DisputeModal({ open, onOpenChange, transactionId, onSuccess }: DisputeModalProps) {
  const [reason, setReason] = useState('unauthorized');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 20) {
      setError('Description must be at least 20 characters');
      return;
    }
    setLoading(true);
    setError('');
    const res = await createDispute(transactionId, reason, description);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    const payload = res.data as { dispute_id?: string; error?: string };
    if (!payload?.dispute_id && !res.data) {
      setError('Could not submit dispute. Try again.');
      return;
    }
    setDisputeId(payload?.dispute_id || 'submitted');
    onSuccess?.();
  };

  const handleClose = (v: boolean) => {
    if (!v) {
      setDisputeId(null);
      setDescription('');
      setReason('unauthorized');
      setError('');
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dispute transaction</DialogTitle>
          <DialogDescription>
            Submit a dispute for review by our team.
          </DialogDescription>
        </DialogHeader>
        {disputeId ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <p className="font-medium">Dispute submitted</p>
            <p className="text-sm text-muted-foreground font-mono">ID: {disputeId}</p>
            <Button onClick={() => handleClose(false)}>Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue (min 20 characters)"
                rows={4}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit dispute'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

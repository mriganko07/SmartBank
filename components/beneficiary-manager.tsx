'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  createBeneficiary,
  deleteBeneficiary,
  type BeneficiaryInfo,
} from '@/lib/api';
import { authFetcher } from '@/lib/swr-fetcher';
import { INDIAN_BANKS, normalizeIfsc } from '@/lib/banking';
import { notifyDashboardRefresh } from '@/lib/dashboard-events';
import { Users, Trash2, Plus } from 'lucide-react';

export function BeneficiaryManager() {
  const { data, mutate, isLoading } = useSWR<{ data: BeneficiaryInfo[] }>(
    '/beneficiaries/',
    authFetcher
  );
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nickname: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: '',
    bank_name: INDIAN_BANKS[0],
  });

  const beneficiaries = data?.data || [];

  const resetForm = useCallback(() => {
    setForm({
      nickname: '',
      account_holder_name: '',
      account_number: '',
      ifsc_code: '',
      bank_name: INDIAN_BANKS[0],
    });
    setShowForm(false);
    setError('');
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    const res = await createBeneficiary({
      nickname: form.nickname || form.account_holder_name,
      account_holder_name: form.account_holder_name,
      account_number: form.account_number.toUpperCase(),
      ifsc_code: normalizeIfsc(form.ifsc_code),
      bank_name: form.bank_name,
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    resetForm();
    mutate();
    notifyDashboardRefresh();
  };

  const handleDelete = async (id: string) => {
    const res = await deleteBeneficiary(id);
    if (!res.error) {
      mutate();
      notifyDashboardRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Save payees with IFSC and bank details for quick transfers.
        </p>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add beneficiary
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New beneficiary</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="grid md:grid-cols-2 gap-4">
              {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
              <div className="space-y-2">
                <Label>Nickname (optional)</Label>
                <Input
                  value={form.nickname}
                  onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                  placeholder="e.g. Rent — Landlord"
                />
              </div>
              <div className="space-y-2">
                <Label>Account holder name</Label>
                <Input
                  value={form.account_holder_name}
                  onChange={(e) =>
                    setForm({ ...form, account_holder_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Account number</Label>
                <Input
                  value={form.account_number}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      account_number: e.target.value.toUpperCase().replace(/\s/g, ''),
                    })
                  }
                  required
                  pattern="SB[0-9]{10}"
                />
              </div>
              <div className="space-y-2">
                <Label>IFSC code</Label>
                <Input
                  value={form.ifsc_code}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      ifsc_code: e.target.value.toUpperCase().replace(/\s/g, ''),
                    })
                  }
                  required
                  maxLength={11}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Bank name</Label>
                <select
                  value={form.bank_name}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                >
                  {INDIAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save beneficiary'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
      )}

      {!isLoading && beneficiaries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
            No beneficiaries yet. Add one to speed up transfers.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {beneficiaries.map((b) => (
          <Card key={b.id}>
            <CardContent className="pt-6 flex justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold truncate">{b.nickname || b.account_holder_name}</p>
                <p className="text-sm text-muted-foreground">{b.account_holder_name}</p>
                <p className="text-xs font-mono mt-1">{b.account_number}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {b.bank_name} · IFSC {b.ifsc_code}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive shrink-0"
                onClick={() => handleDelete(b.id)}
                aria-label="Remove beneficiary"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

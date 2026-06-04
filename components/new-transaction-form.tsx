'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  createTransaction,
  getBeneficiaries,
  lookupBeneficiary,
  type BeneficiaryInfo,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { INDIAN_BANKS, TRANSFER_TYPES, normalizeIfsc } from '@/lib/banking';
import { notifyDashboardRefresh } from '@/lib/dashboard-events';
import { AlertCircle, CheckCircle, Plus, Building2 } from 'lucide-react';

const merchantCategories = [
  'Grocery',
  'Restaurant',
  'Gas Station',
  'Travel',
  'Entertainment',
  'Healthcare',
  'Shopping',
  'Utilities',
  'Transfer',
  'Other',
];

interface TransactionResult {
  transaction_id: string;
  fraud_score: number;
  is_flagged: boolean;
}

export function NewTransactionForm() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState(INDIAN_BANKS[0]);
  const [transferType, setTransferType] = useState<(typeof TRANSFER_TYPES)[number]>('IMPS');
  const [description, setDescription] = useState('');
  const [merchantCategory, setMerchantCategory] = useState('Transfer');
  const [saveBeneficiary, setSaveBeneficiary] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryInfo[]>([]);
  const [lookupHint, setLookupHint] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TransactionResult | null>(null);

  const loadBeneficiaries = useCallback(async () => {
    const res = await getBeneficiaries();
    if (res.data?.data) setBeneficiaries(res.data.data);
  }, []);

  useEffect(() => {
    if (isOpen) loadBeneficiaries();
  }, [isOpen, loadBeneficiaries]);

  const applyBeneficiary = (b: BeneficiaryInfo) => {
    setRecipientAccount(b.account_number);
    setAccountHolder(b.account_holder_name);
    setIfscCode(b.ifsc_code);
    setBankName(b.bank_name);
    setLookupHint(`Loaded payee: ${b.nickname || b.account_holder_name}`);
  };

  const handleAccountBlur = async () => {
    const acct = recipientAccount.trim().toUpperCase();
    if (acct.length < 12) return;
    const res = await lookupBeneficiary(acct);
    if (res.data) {
      setAccountHolder(res.data.account_holder_name);
      if (res.data.ifsc_code) setIfscCode(res.data.ifsc_code);
      if (res.data.bank_name) setBankName(res.data.bank_name);
      setLookupHint(
        res.data.source === 'beneficiary'
          ? 'Details loaded from saved beneficiary'
          : 'Account verified — enter IFSC and bank details'
      );
    } else {
      setLookupHint('');
    }
  };

  const resetForm = () => {
    setAmount('');
    setRecipientAccount('');
    setAccountHolder('');
    setIfscCode('');
    setBankName(INDIAN_BANKS[0]);
    setTransferType('IMPS');
    setDescription('');
    setMerchantCategory('Transfer');
    setSaveBeneficiary(false);
    setLookupHint('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setIsLoading(true);

    try {
      const response = await createTransaction({
        amount: parseFloat(amount),
        recipient_account: recipientAccount.trim().toUpperCase(),
        recipient_account_holder: accountHolder.trim(),
        recipient_ifsc: normalizeIfsc(ifscCode),
        recipient_bank_name: bankName,
        transfer_type: transferType,
        description,
        merchant_category: merchantCategory,
        save_beneficiary: saveBeneficiary,
        location_data: { country: 'in' },
      });

      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setResult(response.data as TransactionResult);
        resetForm();
        notifyDashboardRefresh();
        setTimeout(() => {
          setResult(null);
          setIsOpen(false);
        }, 3000);
      }
    } catch (err) {
      setError('Failed to create transaction');
      console.error('[SmartBank] Transaction error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2 bg-primary hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" />
        New Transfer
      </Button>

      {isOpen && (
        <Card className="mt-4 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Bank transfer (NEFT / IMPS / RTGS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user?.account_number && (
              <div className="text-sm text-muted-foreground mb-4 space-y-1 rounded-lg bg-secondary/40 p-3">
                <p>
                  Debit from:{' '}
                  <span className="font-mono font-medium text-foreground">
                    {user.account_number}
                  </span>
                </p>
                {user.ifsc_code && (
                  <p>
                    Your IFSC: <span className="font-mono text-foreground">{user.ifsc_code}</span>
                    {' · '}
                    {user.bank_name}
                  </p>
                )}
                <p className="text-xs">
                  Beneficiary IFSC and bank are loaded from their SmartBank profile when you enter their account number.
                </p>
              </div>
            )}

            {beneficiaries.length > 0 && (
              <div className="mb-4 space-y-2">
                <Label className="text-sm">Saved beneficiaries</Label>
                <div className="flex flex-wrap gap-2">
                  {beneficiaries.map((b) => (
                    <Button
                      key={b.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyBeneficiary(b)}
                      disabled={isLoading}
                    >
                      {b.nickname || b.account_holder_name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-3">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {result && (
                <div className="flex items-start gap-3 rounded-lg bg-green-500/10 p-3">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-600">
                    <p className="font-medium">Transfer initiated successfully</p>
                    <p className="text-xs mt-1">
                      {result.is_flagged
                        ? `High risk (Score: ${(result.fraud_score * 100).toFixed(1)}%)`
                        : `Low risk (Score: ${(result.fraud_score * 100).toFixed(1)}%)`}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="transfer-type">Transfer type</Label>
                  <select
                    id="transfer-type"
                    value={transferType}
                    onChange={(e) =>
                      setTransferType(e.target.value as (typeof TRANSFER_TYPES)[number])
                    }
                    disabled={isLoading}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  >
                    {TRANSFER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    disabled={isLoading}
                    step="0.01"
                    min="0.01"
                    max="1000000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient">Beneficiary account number</Label>
                  <Input
                    id="recipient"
                    type="text"
                    placeholder="SB1234567890"
                    value={recipientAccount}
                    onChange={(e) =>
                      setRecipientAccount(e.target.value.toUpperCase().replace(/\s/g, ''))
                    }
                    onBlur={handleAccountBlur}
                    required
                    disabled={isLoading}
                    minLength={12}
                    maxLength={12}
                    pattern="SB[0-9]{10}"
                    title="SmartBank account: SB + 10 digits"
                  />
                  {lookupHint && (
                    <p className="text-xs text-primary">{lookupHint}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="holder">Account holder name</Label>
                  <Input
                    id="holder"
                    type="text"
                    placeholder="As per bank records"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ifsc">IFSC code</Label>
                  <Input
                    id="ifsc"
                    type="text"
                    placeholder="HDFC0001234"
                    value={ifscCode}
                    onChange={(e) =>
                      setIfscCode(e.target.value.toUpperCase().replace(/\s/g, ''))
                    }
                    required
                    disabled={isLoading}
                    minLength={11}
                    maxLength={11}
                    pattern="[A-Z]{4}0[A-Z0-9]{6}"
                    title="11-character IFSC (e.g. HDFC0001234)"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bank">Bank name</Label>
                  <select
                    id="bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  >
                    {INDIAN_BANKS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Remarks / description</Label>
                  <Input
                    id="description"
                    type="text"
                    placeholder="Payment for..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={merchantCategory}
                    onChange={(e) => setMerchantCategory(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  >
                    {merchantCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="save-beneficiary"
                  checked={saveBeneficiary}
                  onCheckedChange={(v) => setSaveBeneficiary(v === true)}
                  disabled={isLoading}
                />
                <Label htmlFor="save-beneficiary" className="text-sm font-normal cursor-pointer">
                  Save as beneficiary for future transfers
                </Label>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing transfer...' : 'Send transfer'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}

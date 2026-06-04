'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { authFetcher } from '@/lib/swr-fetcher';
import {
  openFixedDeposit,
  breakFixedDeposit,
  applyLoan,
  payLoanEmi,
  type FixedDepositInfo,
  type LoanInfo,
} from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PiggyBank, Wallet } from 'lucide-react';
import { formatDateTime } from '@/lib/datetime';

const FD_TENURES = [6, 12, 24, 36, 60];
const LOAN_PURPOSES = [
  { value: 'personal', label: 'Personal' },
  { value: 'home', label: 'Home' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'education', label: 'Education' },
  { value: 'business', label: 'Business' },
];

export function BankingProducts() {
  const { data: fdData, mutate: mutateFd } = useSWR<{ data: FixedDepositInfo[] }>(
    '/banking/fd/',
    authFetcher
  );
  const { data: loanData, mutate: mutateLoans } = useSWR<{ data: LoanInfo[] }>(
    '/banking/loans/',
    authFetcher
  );

  const [fdPrincipal, setFdPrincipal] = useState('50000');
  const [fdTenure, setFdTenure] = useState(12);
  const [loanPrincipal, setLoanPrincipal] = useState('100000');
  const [loanTenure, setLoanTenure] = useState(24);
  const [loanPurpose, setLoanPurpose] = useState('personal');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const fds = fdData?.data || [];
  const loans = loanData?.data || [];

  const handleOpenFd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    setMsg('');
    const res = await openFixedDeposit(parseFloat(fdPrincipal), fdTenure);
    setLoading(false);
    if (res.error) setErr(res.error);
    else {
      setMsg('Fixed deposit opened successfully');
      mutateFd();
    }
  };

  const handleBreakFd = async (id: string) => {
    const res = await breakFixedDeposit(id);
    if (res.error) setErr(res.error);
    else {
      setMsg('FD closed early');
      mutateFd();
    }
  };

  const handleApplyLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr('');
    setMsg('');
    const res = await applyLoan(
      parseFloat(loanPrincipal),
      loanTenure,
      loanPurpose
    );
    setLoading(false);
    if (res.error) setErr(res.error);
    else {
      setMsg('Loan approved and disbursed to your SmartBank account');
      mutateLoans();
    }
  };

  const handlePayEmi = async (loan: LoanInfo) => {
    const res = await payLoanEmi(loan.id, loan.emi_amount);
    if (res.error) setErr(res.error);
    else {
      setMsg(`EMI of ₹${loan.emi_amount.toLocaleString()} paid`);
      mutateLoans();
    }
  };

  return (
    <div className="space-y-4">
      {msg && <p className="text-sm text-green-600 bg-green-500/10 p-3 rounded-lg">{msg}</p>}
      {err && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{err}</p>}

      <Tabs defaultValue="fd">
        <TabsList>
          <TabsTrigger value="fd" className="gap-2">
            <PiggyBank className="h-4 w-4" />
            Fixed Deposit
          </TabsTrigger>
          <TabsTrigger value="loans" className="gap-2">
            <Wallet className="h-4 w-4" />
            Loans
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fd" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Open new FD</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOpenFd} className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    min={1000}
                    value={fdPrincipal}
                    onChange={(e) => setFdPrincipal(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tenure (months)</Label>
                  <select
                    value={fdTenure}
                    onChange={(e) => setFdTenure(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  >
                    {FD_TENURES.map((t) => (
                      <option key={t} value={t}>
                        {t} months
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={loading} className="w-full">
                    Open FD
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="font-semibold">Your fixed deposits</h3>
            {fds.length === 0 && (
              <p className="text-sm text-muted-foreground">No FDs yet.</p>
            )}
            {fds.map((fd) => (
              <Card key={fd.id}>
                <CardContent className="pt-6 flex flex-wrap justify-between gap-4">
                  <div>
                    <p className="font-semibold">₹{fd.principal.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {fd.interest_rate}% p.a. · {fd.tenure_months} months · Matures ₹
                      {fd.maturity_amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(fd.start_date).split(',')[0]} →{' '}
                      {formatDateTime(fd.maturity_date).split(',')[0]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{fd.status}</Badge>
                    {fd.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => handleBreakFd(fd.id)}>
                        Break FD
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="loans" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Apply for loan</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleApplyLoan} className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input
                    type="number"
                    min={5000}
                    value={loanPrincipal}
                    onChange={(e) => setLoanPrincipal(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tenure (months)</Label>
                  <Input
                    type="number"
                    min={6}
                    max={360}
                    value={loanTenure}
                    onChange={(e) => setLoanTenure(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Purpose</Label>
                  <select
                    value={loanPurpose}
                    onChange={(e) => setLoanPurpose(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background"
                  >
                    {LOAN_PURPOSES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" disabled={loading} className="md:col-span-2">
                  Apply now
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="font-semibold">Your loans</h3>
            {loans.length === 0 && (
              <p className="text-sm text-muted-foreground">No active loans.</p>
            )}
            {loans.map((loan) => (
              <Card key={loan.id}>
                <CardContent className="pt-6 flex flex-wrap justify-between gap-4">
                  <div>
                    <p className="font-semibold capitalize">{loan.purpose} loan</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{loan.principal.toLocaleString()} @ {loan.interest_rate}% · EMI ₹
                      {loan.emi_amount.toLocaleString()}
                    </p>
                    <p className="text-sm mt-1">
                      Outstanding: ₹{loan.outstanding_balance.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Next EMI: {formatDateTime(loan.next_emi_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{loan.status}</Badge>
                    {loan.status === 'active' && loan.outstanding_balance > 0 && (
                      <Button size="sm" onClick={() => handlePayEmi(loan)}>
                        Pay EMI
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { formatTransactionWhen } from '@/lib/datetime';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export interface TransactionItem {
  id: string;
  direction?: 'outgoing' | 'incoming';
  user_account?: string;
  sender_account?: string;
  recipient_account?: string;
  counterparty_account?: string;
  counterparty_name?: string;
  recipient_account_holder?: string;
  recipient_ifsc?: string;
  recipient_bank_name?: string;
  transfer_type?: string;
  amount: number;
  description: string;
  merchant_category: string;
  fraud_score: number;
  is_flagged: boolean;
  status: string;
  created_at: string;
}

export function FraudBadge({ fraudScore, isFlagged }: { fraudScore: number; isFlagged: boolean }) {
  if (isFlagged) {
    return (
      <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30">
        <AlertCircle className="h-3 w-3 mr-1" />
        High Risk
      </Badge>
    );
  }
  if (fraudScore > 0.4) {
    return (
      <Badge className="bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30">
        Medium Risk
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-500/20 text-green-700 hover:bg-green-500/30">
      Low Risk
    </Badge>
  );
}

export function TransactionRow({ tx }: { tx: TransactionItem }) {
  const isIncoming = tx.direction === 'incoming';
  const label = isIncoming ? 'Received from' : 'Sent to';
  const counterparty = tx.counterparty_name || 'Unknown';
  const account = tx.counterparty_account || (isIncoming ? tx.sender_account : tx.recipient_account);

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
            isIncoming ? 'bg-green-500/15' : 'bg-primary/10'
          }`}
        >
          {isIncoming ? (
            <ArrowDownLeft className="h-5 w-5 text-green-600" />
          ) : (
            <ArrowUpRight className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{tx.description}</p>
          <p className="text-xs text-muted-foreground">
            {label}{' '}
            <span className="font-medium text-foreground">{counterparty}</span>
          </p>
          <p className="text-xs font-mono text-primary truncate">{account}</p>
          {!isIncoming && tx.recipient_bank_name && (
            <p className="text-xs text-muted-foreground truncate">
              {tx.recipient_bank_name}
              {tx.recipient_ifsc ? ` · IFSC ${tx.recipient_ifsc}` : ''}
              {tx.transfer_type ? ` · ${tx.transfer_type}` : ''}
            </p>
          )}
          {!isIncoming && tx.recipient_account_holder && (
            <p className="text-xs text-muted-foreground">
              Holder: {tx.recipient_account_holder}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            Your account: <span className="font-mono">{tx.user_account}</span>
            {' · '}
            {tx.merchant_category}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p
            className={`text-sm font-semibold ${
              isIncoming ? 'text-green-600' : 'text-foreground'
            }`}
          >
            {isIncoming ? '+' : '-'}₹{tx.amount.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground" title={tx.created_at}>
            {formatTransactionWhen(tx.created_at)}
          </p>
        </div>
        {tx.direction === 'outgoing' && (
          <FraudBadge fraudScore={tx.fraud_score} isFlagged={tx.is_flagged} />
        )}
        {tx.direction === 'incoming' && (
          <Badge className="bg-green-500/15 text-green-700">Received</Badge>
        )}
      </div>
    </div>
  );
}

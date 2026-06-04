/** Indian banking helpers for transfers (IFSC, bank list). */

export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function normalizeIfsc(value: string): string {
  return value.trim().toUpperCase().replace(/\s/g, '');
}

export function isValidIfsc(value: string): boolean {
  return IFSC_PATTERN.test(normalizeIfsc(value));
}

export const INDIAN_BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'Indian Bank',
  'IndusInd Bank',
  'Yes Bank',
  'IDFC First Bank',
  'Federal Bank',
  'Bandhan Bank',
  'Other',
] as const;

export const TRANSFER_TYPES = ['IMPS', 'NEFT', 'RTGS'] as const;

export type TransferType = (typeof TRANSFER_TYPES)[number];

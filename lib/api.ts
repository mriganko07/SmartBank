const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

/** Turn Django REST Framework validation payloads into a readable message. */
function formatApiError(body: Record<string, unknown>): string {
  if (typeof body.error === 'string') return body.error;
  if (typeof body.detail === 'string') return body.detail;
  if (Array.isArray(body.detail)) {
    return body.detail.map((item) => String(item)).join(' ');
  }

  const fieldMessages: string[] = [];
  for (const [field, value] of Object.entries(body)) {
    if (field === 'detail' || field === 'error') continue;
    const label =
      field === 'non_field_errors' ? 'Error' : field.replace(/_/g, ' ');
    if (Array.isArray(value)) {
      value.forEach((msg) => fieldMessages.push(`${label}: ${String(msg)}`));
    } else if (typeof value === 'string') {
      fieldMessages.push(`${label}: ${value}`);
    }
  }

  if (fieldMessages.length > 0) return fieldMessages.join(' ');
  return 'An error occurred';
}

export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const responseData = await response.json();

    if (!response.ok) {
      return {
        error: formatApiError(
          typeof responseData === 'object' && responseData !== null
            ? (responseData as Record<string, unknown>)
            : {}
        ),
      };
    }

    return { data: responseData };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'An error occurred',
    };
  }
}

export async function register(
  email: string,
  password: string,
  fullName: string,
  phone?: string
) {
  return apiCall('/auth/register/', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
      phone: phone || '',
    }),
  });
}

export async function login(email: string, password: string) {
  return apiCall('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getUserProfile() {
  return apiCall('/auth/profile/', {
    method: 'GET',
  });
}

export interface CreateTransactionPayload {
  amount: number;
  recipient_account: string;
  recipient_account_holder: string;
  recipient_ifsc: string;
  recipient_bank_name: string;
  transfer_type?: 'IMPS' | 'NEFT' | 'RTGS';
  description: string;
  merchant_category: string;
  location_data?: Record<string, string>;
  save_beneficiary?: boolean;
}

export async function createTransaction(payload: CreateTransactionPayload) {
  return apiCall('/transactions/create/', {
    method: 'POST',
    body: JSON.stringify({
      transfer_type: 'IMPS',
      location_data: {},
      save_beneficiary: false,
      ...payload,
    }),
  });
}

export async function getTransactions() {
  return apiCall('/transactions/', {
    method: 'GET',
  });
}

export async function getTransactionDetail(transactionId: string) {
  return apiCall(`/transactions/${transactionId}/`, {
    method: 'GET',
  });
}

export async function getAlerts(unreadOnly = false) {
  const query = unreadOnly ? '?unread_only=true' : '';
  return apiCall(`/alerts/${query}`, {
    method: 'GET',
  });
}

export async function markAlertAsRead(alertId: string) {
  return apiCall(`/alerts/${alertId}/read/`, {
    method: 'POST',
  });
}

export async function markAllAlertsRead() {
  return apiCall('/alerts/read-all/', { method: 'POST' });
}

export async function getDashboardStats() {
  return apiCall('/analytics/dashboard/', {
    method: 'GET',
  });
}

export async function getAnalyticsData(days = 30) {
  return apiCall(`/analytics/data/?days=${days}`, {
    method: 'GET',
  });
}

export async function verifyOtp(userId: string, otpCode: string) {
  return apiCall('/auth/verify-otp/', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, otp_code: otpCode }),
  });
}

export async function resendOtp(userId: string) {
  return apiCall('/auth/resend-otp/', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function getSessions() {
  return apiCall<{ data: SessionInfo[] }>('/auth/sessions/', { method: 'GET' });
}

export async function revokeSession(sessionId: string) {
  return apiCall(`/auth/sessions/${sessionId}/`, { method: 'DELETE' });
}

export async function revokeAllSessions() {
  return apiCall('/auth/sessions/all/', { method: 'DELETE' });
}

export async function sessionHeartbeat() {
  return apiCall('/auth/sessions/heartbeat/', { method: 'PATCH' });
}

export async function createDispute(
  transactionId: string,
  reason: string,
  description: string
) {
  return apiCall('/disputes/create/', {
    method: 'POST',
    body: JSON.stringify({
      transaction_id: transactionId,
      reason,
      description,
    }),
  });
}

export async function getDisputes() {
  return apiCall<{ data: DisputeInfo[] }>('/disputes/', { method: 'GET' });
}

export async function getSpendingSummary() {
  return apiCall<SpendingSummary>('/analytics/spending-summary/', {
    method: 'GET',
  });
}

export async function updateSpendingLimits(weekly?: number | null, monthly?: number | null) {
  return apiCall('/auth/profile/limits/', {
    method: 'PATCH',
    body: JSON.stringify({ weekly, monthly }),
  });
}

export async function getAlertPreferences() {
  return apiCall<AlertPreferences>('/auth/alert-preferences/', { method: 'GET' });
}

export async function updateAlertPreferences(prefs: Partial<AlertPreferences>) {
  return apiCall('/auth/alert-preferences/', {
    method: 'PATCH',
    body: JSON.stringify(prefs),
  });
}

export async function getCategoryAnalytics(period: 'weekly' | 'monthly' = 'monthly') {
  return apiCall<{ period: string; data: CategorySpend[] }>(
    `/analytics/categories/?period=${period}`,
    { method: 'GET' }
  );
}

export async function exportTransactionsBlob(
  format: 'csv' | 'pdf',
  startDate: string,
  endDate: string
): Promise<{ blob?: Blob; error?: string }> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  try {
    const response = await fetch(
      `${API_BASE_URL}/transactions/export/?format=${format}&start_date=${startDate}&end_date=${endDate}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        error: formatApiError(body as Record<string, unknown>),
      };
    }
    const blob = await response.blob();
    return { blob };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Export failed' };
  }
}

export interface SessionInfo {
  session_id: string;
  device_name: string;
  browser: string;
  os: string;
  ip_address: string;
  location_city: string;
  last_active: string;
  is_current: boolean;
}

export interface DisputeInfo {
  id: string;
  transaction_id: string;
  reason: string;
  description: string;
  status: string;
  created_at: string;
}

export interface SpendingSummary {
  weekly: { limit: number | null; spent: number; percent: number };
  monthly: { limit: number | null; spent: number; percent: number };
}

export interface AlertPreferences {
  amount_threshold: number;
  notify_international: boolean;
  notify_high_risk_category: boolean;
  notify_frequency: boolean;
  channels: { in_app: boolean; email: boolean; sms: boolean };
}

export interface CategorySpend {
  category: string;
  total_amount: number;
  count: number;
  percent_of_total: number;
  prev_period_amount: number;
  change_percent: number;
}

export interface BeneficiaryInfo {
  id: string;
  nickname: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  created_at: string;
}

export interface BeneficiaryLookup {
  source: 'beneficiary' | 'registered_user';
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
}

export async function getBeneficiaries() {
  return apiCall<{ count: number; data: BeneficiaryInfo[] }>('/beneficiaries/', {
    method: 'GET',
  });
}

export async function createBeneficiary(data: {
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  nickname?: string;
}) {
  return apiCall('/beneficiaries/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteBeneficiary(beneficiaryId: string) {
  return apiCall(`/beneficiaries/${beneficiaryId}/`, { method: 'DELETE' });
}

export async function lookupBeneficiary(accountNumber: string) {
  return apiCall<BeneficiaryLookup>(
    `/beneficiaries/lookup/?account_number=${encodeURIComponent(accountNumber)}`,
    { method: 'GET' }
  );
}

export interface FixedDepositInfo {
  id: string;
  principal: number;
  interest_rate: number;
  tenure_months: number;
  maturity_amount: number;
  status: string;
  start_date: string;
  maturity_date: string;
}

export interface LoanInfo {
  id: string;
  principal: number;
  interest_rate: number;
  tenure_months: number;
  emi_amount: number;
  outstanding_balance: number;
  purpose: string;
  status: string;
  next_emi_date: string;
}

export async function getFixedDeposits() {
  return apiCall<{ data: FixedDepositInfo[] }>('/banking/fd/', { method: 'GET' });
}

export async function openFixedDeposit(principal: number, tenureMonths: number) {
  return apiCall('/banking/fd/', {
    method: 'POST',
    body: JSON.stringify({ principal, tenure_months: tenureMonths }),
  });
}

export async function breakFixedDeposit(fdId: string) {
  return apiCall(`/banking/fd/${fdId}/break/`, { method: 'POST' });
}

export async function getLoans() {
  return apiCall<{ data: LoanInfo[] }>('/banking/loans/', { method: 'GET' });
}

export async function applyLoan(
  principal: number,
  tenureMonths: number,
  purpose: string
) {
  return apiCall('/banking/loans/', {
    method: 'POST',
    body: JSON.stringify({
      principal,
      tenure_months: tenureMonths,
      purpose,
    }),
  });
}

export async function payLoanEmi(loanId: string, amount: number) {
  return apiCall(`/banking/loans/${loanId}/pay/`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

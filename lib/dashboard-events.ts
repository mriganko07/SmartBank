/** Cross-component refresh when dashboard data changes (e.g. new transfer). */

export const DASHBOARD_REFRESH_EVENT = 'smartbank-dashboard-refresh';

export function notifyDashboardRefresh(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DASHBOARD_REFRESH_EVENT));
  }
}

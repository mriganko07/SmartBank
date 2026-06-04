'use client';

import { useEffect, useRef } from 'react';
import { DASHBOARD_REFRESH_EVENT } from '@/lib/dashboard-events';

/**
 * Polls on an interval and listens for dashboard refresh events (e.g. after a new transfer).
 */
export function useRealtimeRefresh(
  onRefresh: () => void | Promise<void>,
  intervalMs = 10000
) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const run = () => {
      void onRefreshRef.current();
    };
    run();

    const onEvent = () => run();
    window.addEventListener(DASHBOARD_REFRESH_EVENT, onEvent);
    const timer = setInterval(run, intervalMs);

    return () => {
      window.removeEventListener(DASHBOARD_REFRESH_EVENT, onEvent);
      clearInterval(timer);
    };
  }, [intervalMs]);
}

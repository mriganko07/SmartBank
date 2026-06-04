'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { DashboardNav } from '@/components/dashboard-nav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { getAlertPreferences, updateAlertPreferences, type AlertPreferences } from '@/lib/api';
import { toast } from 'sonner';

export default function AlertPreferencesPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [prefs, setPrefs] = useState<AlertPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getAlertPreferences().then((res) => {
      if (res.data) setPrefs(res.data as AlertPreferences);
    });
  }, [isAuthenticated]);

  const handleSave = async () => {
    if (!prefs) return;
    setSaving(true);
    const res = await updateAlertPreferences(prefs);
    setSaving(false);
    if (res.error) toast.error(res.error);
    else toast.success('Preferences saved');
  };

  if (isLoading || !prefs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <DashboardNav />
      <main className="min-h-screen bg-gradient-to-b from-background to-background/95">
        <div className="max-w-xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link href="/alerts" className="text-sm text-primary hover:underline">
              ← Back to alerts
            </Link>
            <h1 className="text-3xl font-bold mt-2">Alert preferences</h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Notification settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <label className="text-sm font-medium">
                  Amount threshold: ₹{prefs.amount_threshold.toLocaleString()}
                </label>
                <Slider
                  min={1000}
                  max={100000}
                  step={1000}
                  value={[prefs.amount_threshold]}
                  onValueChange={([v]) =>
                    setPrefs({ ...prefs, amount_threshold: v })
                  }
                />
              </div>
              {[
                ['notify_international', 'International transaction alerts'],
                ['notify_high_risk_category', 'High-risk category alerts'],
                ['notify_frequency', 'High frequency alerts'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm">{label}</span>
                  <Switch
                    checked={prefs[key as keyof AlertPreferences] as boolean}
                    onCheckedChange={(c) =>
                      setPrefs({ ...prefs, [key]: c })
                    }
                  />
                </div>
              ))}
              <div className="space-y-3">
                <p className="text-sm font-medium">Channels</p>
                {(['in_app', 'email', 'sms'] as const).map((ch) => (
                  <label key={ch} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={prefs.channels[ch]}
                      onCheckedChange={(c) =>
                        setPrefs({
                          ...prefs,
                          channels: { ...prefs.channels, [ch]: !!c },
                        })
                      }
                    />
                    {ch === 'in_app' ? 'In-app' : ch.charAt(0).toUpperCase() + ch.slice(1)}
                  </label>
                ))}
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save preferences'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

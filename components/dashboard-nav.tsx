'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Wallet,
  AlertCircle,
  BarChart3,
  LogOut,
  Menu,
  X,
  Scale,
  User,
  Monitor,
  ChevronDown,
  Users,
  Landmark,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getUserProfile } from '@/lib/api';

export function DashboardNav() {
  const { user, token, login, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user || user.account_number || !token) return;
    getUserProfile().then((response) => {
      if (response.data) {
        login(
          {
            ...user,
            account_number: response.data.account_number,
            ifsc_code: response.data.ifsc_code,
            bank_name: response.data.bank_name,
            branch_name: response.data.branch_name,
          },
          token
        );
      }
    });
  }, [user, token, login]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/transactions', label: 'Transactions', icon: Wallet },
    { href: '/beneficiaries', label: 'Beneficiaries', icon: Users },
    { href: '/banking', label: 'FD & Loans', icon: Landmark },
    { href: '/alerts', label: 'Alerts', icon: AlertCircle },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/disputes', label: 'Disputes', icon: Scale },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="px-4 py-3 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              SB
            </div>
            <h1 className="font-bold text-lg hidden sm:block">SmartBank</h1>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary transition-colors"
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right mr-1">
              <p className="text-sm font-medium">{user?.full_name}</p>
              {user?.account_number ? (
                <p className="text-xs font-mono text-primary">{user.account_number}</p>
              ) : null}
              {user?.ifsc_code ? (
                <p className="text-xs text-muted-foreground">IFSC {user.ifsc_code}</p>
              ) : null}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <User className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile/sessions" className="flex items-center gap-2 cursor-pointer">
                    <Monitor className="h-4 w-4" />
                    Sessions
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={handleLogout} variant="outline" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>

            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 hover:bg-secondary rounded-lg"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden mt-3 space-y-2 pb-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary w-full"
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
            <Link
              href="/profile/sessions"
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary w-full"
              onClick={() => setIsOpen(false)}
            >
              <Monitor className="h-4 w-4" />
              Sessions
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

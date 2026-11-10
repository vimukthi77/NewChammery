'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Home,
  History,
  WalletCards,
  User,
  Users,
  BarChart3,
  Sliders,
  DollarSign,
  ClipboardList
} from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Do not render bottom nav on splash or login page
  if (pathname === '/login' || pathname === '/') {
    return null;
  }

  const role = (session?.user as any)?.role || 'user';

  // Regular staff user navigation (No arbitrary pre-order tab)
  const userNavItems = [
    { label: 'Home', href: '/dashboard', icon: Home },
    { label: 'History', href: '/history', icon: History },
    { label: 'Balance', href: '/balance', icon: WalletCards },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  // Admin navigation
  const adminNavItems = [
    { label: 'Home', href: '/admin/dashboard', icon: Home },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Requests', href: '/admin/meal-requests', icon: ClipboardList },
    { label: 'Topup', href: '/admin/topup', icon: DollarSign },
    { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
    { label: 'Cutoffs', href: '/admin/cutoff-settings', icon: Sliders },
  ];

  const navItems = role === 'admin' ? adminNavItems : userNavItems;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <motion.nav
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="pointer-events-auto flex items-center justify-around bg-[#1A1A2E]/95 backdrop-blur-md text-white px-4 py-2.5 rounded-full shadow-2xl border border-white/10 max-w-sm sm:max-w-md w-full"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/admin/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center py-1 px-3 group"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBadge"
                  className="absolute inset-0 bg-[#E67E22] rounded-full -z-10 shadow-md"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 ${
                  isActive ? 'text-white scale-110' : 'text-gray-400 group-hover:text-white'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span
                className={`text-[10px] font-medium tracking-tight mt-0.5 ${
                  isActive ? 'text-white font-semibold' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </motion.nav>
    </div>
  );
}

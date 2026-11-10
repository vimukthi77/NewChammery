'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { Bell, ShieldCheck, User as UserIcon, Utensils, ChefHat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  useEffect(() => {
    fetch('/api/announcements')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.announcements) {
          setAnnouncements(data.announcements);
        }
      })
      .catch(() => {});
  }, []);

  if (pathname === '/login' || pathname === '/') {
    return null;
  }

  const role = (session?.user as any)?.role || 'user';
  const isAdminPath = pathname.startsWith('/admin');

  return (
    <header className="sticky top-0 z-40 bg-[#FFF8F0]/90 backdrop-blur-md border-b border-[#F5E6D3]/60 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Left: Brand / Logo */}
        <Link
          href={role === 'admin' ? '/admin/dashboard' : (role === 'cook' ? '/cook/dashboard' : '/dashboard')}
          className="flex items-center gap-2.5"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E67E22] to-[#8B4513] flex items-center justify-center text-white shadow-md shadow-[#E67E22]/20">
            <Utensils size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-[#1A1A2E] block leading-none">
              Chammery
            </span>
            <span className="text-[10px] font-semibold text-[#8B4513] tracking-wider uppercase block mt-0.5">
              {role === 'admin' ? 'Admin Portal' : (role === 'cook' ? 'Kitchen Portal' : 'Meal Portal')}
            </span>
          </div>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Role Badges */}
          {role === 'admin' && (
            <div className="text-xs px-3 py-1.5 rounded-full font-bold bg-[#1A1A2E] text-white flex items-center gap-1.5 shadow-sm">
              <ShieldCheck size={14} className="text-[#E67E22]" />
              <span>Admin Access</span>
            </div>
          )}
          {role === 'cook' && (
            <div className="text-xs px-3 py-1.5 rounded-full font-bold bg-[#E67E22] text-white flex items-center gap-1.5 shadow-sm">
              <ChefHat size={14} />
              <span>Kitchen Staff</span>
            </div>
          )}

          {/* Announcements Bell */}
          <div className="relative">
            <button
              onClick={() => setShowAnnouncements(!showAnnouncements)}
              className="w-9 h-9 rounded-full bg-white/80 border border-[#F5E6D3] flex items-center justify-center text-[#1A1A2E] hover:bg-white shadow-sm transition"
              aria-label="Announcements"
            >
              <Bell size={18} />
              {announcements.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#E67E22] rounded-full border-2 border-white ring-1 ring-[#E67E22]/30" />
              )}
            </button>

            {/* Announcements Dropdown */}
            <AnimatePresence>
              {showAnnouncements && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#F5E6D3] p-4 z-50"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
                    <h4 className="font-bold text-sm text-[#1A1A2E]">Announcements</h4>
                    <span className="text-[11px] text-[#8B4513] font-semibold">
                      {announcements.length} new
                    </span>
                  </div>
                  {announcements.length === 0 ? (
                    <p className="text-xs text-gray-500 py-3 text-center">No current announcements</p>
                  ) : (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto">
                      {announcements.map((a) => (
                        <div key={a._id} className="p-2.5 rounded-xl bg-[#FFF8F0] border border-[#F5E6D3]/60">
                          <p className="text-xs font-bold text-[#1A1A2E]">{a.title}</p>
                          <p className="text-[11px] text-gray-600 mt-0.5">{a.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Avatar */}
          <Link
            href="/profile"
            className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-[#FFDAB9] to-[#E67E22] p-0.5 border border-white shadow-sm flex items-center justify-center text-white"
          >
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="font-bold text-xs text-[#1A1A2E]">
                {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : <UserIcon size={16} />}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}


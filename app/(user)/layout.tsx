'use client';

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (role === 'admin' && pathname !== '/profile') {
        router.replace('/admin/dashboard');
      } else if (role === 'cook' && pathname !== '/profile') {
        router.replace('/cook/dashboard');
      }
    }
  }, [session, status, router, pathname]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0]">
        <div className="w-8 h-8 border-2 border-[#E67E22] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role = (session?.user as any)?.role;
  if ((role === 'admin' || role === 'cook') && pathname !== '/profile') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0]">
        <div className="w-8 h-8 border-2 border-[#E67E22] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

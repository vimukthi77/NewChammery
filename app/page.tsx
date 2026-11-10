'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { MEAL_ASSETS } from '@/lib/constants';

export default function WelcomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const seen = localStorage.getItem('chammery_welcome_seen');
    if (seen) {
      if (session) {
        const role = (session.user as any)?.role;
        router.replace(role === 'admin' ? '/admin/dashboard' : '/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [session, router]);

  const handleGetStarted = () => {
    localStorage.setItem('chammery_welcome_seen', 'true');
    if (session) {
      const role = (session.user as any)?.role;
      router.push(role === 'admin' ? '/admin/dashboard' : '/dashboard');
    } else {
      router.push('/login');
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E67E22] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#1A1A2E] overflow-hidden flex flex-col justify-end">
      {/* Background Image of Chef cooking with warm fire */}
      <div className="absolute inset-0 z-0">
        <img
          src={MEAL_ASSETS.welcomeChef}
          alt="Chef cooking"
          className="w-full h-full object-cover object-center filter brightness-[0.85]"
        />
        {/* Dark warm gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      {/* Top Brand Tag */}
      <div className="absolute top-8 left-0 right-0 z-10 flex justify-center">
        <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-xs font-semibold tracking-wider uppercase">
          Chammery Meal Service
        </div>
      </div>

      {/* Bottom Content Card - Matching Mockup Screen 1 */}
      <div className="relative z-10 p-6 sm:p-8 max-w-md mx-auto w-full mb-4">
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="bg-black/40 backdrop-blur-xl border border-white/15 p-6 rounded-3xl text-center shadow-2xl"
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Exceptional Food, <br />
            <span className="text-[#FFDAB9]">Delivered Fresh</span>
          </h1>

          <p className="text-gray-300 text-sm mt-3 font-normal leading-relaxed">
            Thoughtfully prepared, freshly delivered meals.
          </p>

          {/* Action Row */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={handleGetStarted}
              className="flex-1 py-4 px-6 bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white text-sm font-bold rounded-2xl border border-white/20 backdrop-blur-md transition shadow-lg flex items-center justify-center"
            >
              Get Started
            </button>

            <button
              onClick={handleGetStarted}
              aria-label="Continue"
              className="w-14 h-14 bg-white/20 hover:bg-[#E67E22] active:scale-95 text-white rounded-2xl border border-white/20 flex items-center justify-center transition shadow-lg"
            >
              <ArrowUpRight size={22} className="stroke-[2.5]" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


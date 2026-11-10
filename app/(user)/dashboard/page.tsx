'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays } from 'date-fns';
import {
  Sparkles,
  CheckCircle2,
  Calendar,
  Zap,
  ArrowRight,
  Clock,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import MealCard from '@/components/meals/MealCard';
import { MEAL_ASSETS } from '@/lib/constants';
import { isPastCutoff, formatDateString } from '@/lib/utils';

export default function UserDashboard() {
  const { data: session } = useSession();
  const router = useRouter();

  // Admin users are strictly redirected to Admin Dashboard
  useEffect(() => {
    if (session && (session.user as any)?.role === 'admin') {
      router.replace('/admin/dashboard');
    }
  }, [session, router]);

  const [cutoffs, setCutoffs] = useState({
    breakfastCutoffTime: '07:00',
    lunchCutoffTime: '10:00',
    dinnerCutoffTime: '15:00',
  });

  const [userStats, setUserStats] = useState({
    allocated: 0,
    used: 0,
    balance: 0,
  });

  // Selected meal state
  const [selectedBreakfast, setSelectedBreakfast] = useState(false);
  const [selectedLunch, setSelectedLunch] = useState(false);
  const [selectedDinner, setSelectedDinner] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Automatic cutoff logic:
  // If current time is past today's dinner cutoff, automatically target tomorrow!
  const now = new Date();
  const isAfterDinnerCutoff = isPastCutoff(cutoffs.dinnerCutoffTime, now);

  const activeDate = isAfterDinnerCutoff ? addDays(now, 1) : now;
  const activeDateStr = formatDateString(activeDate);
  const isViewingTomorrow = isAfterDinnerCutoff;

  // Determine greeting
  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Fetch meals and stats for active date
  const fetchMealData = async () => {
    try {
      setLoading(true);

      // Fetch cutoffs and active date's request
      const res = await fetch(`/api/meals?date=${activeDateStr}`);
      const data = await res.json();

      if (data.success) {
        if (data.cutoffs) {
          setCutoffs(data.cutoffs);
        }

        if (data.request) {
          setExistingRequest(data.request);
          setSelectedBreakfast(Boolean(data.request.breakfast));
          setSelectedLunch(Boolean(data.request.lunch));
          setSelectedDinner(Boolean(data.request.dinner));
        } else {
          setExistingRequest(null);
          setSelectedBreakfast(false);
          setSelectedLunch(false);
          setSelectedDinner(false);
        }

        // Fetch balance stats
        const statsRes = await fetch('/api/meals?month=' + activeDateStr.slice(0, 7));
        const statsData = await statsRes.json();
        if (statsData.success && statsData.userStats) {
          setUserStats(statsData.userStats);
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMealData();
  }, [activeDateStr]);

  // Cutoff checks for active date
  const isBreakfastCutoff = !isViewingTomorrow && isPastCutoff(cutoffs.breakfastCutoffTime, activeDate);
  const isLunchCutoff = !isViewingTomorrow && isPastCutoff(cutoffs.lunchCutoffTime, activeDate);
  const isDinnerCutoff = !isViewingTomorrow && isPastCutoff(cutoffs.dinnerCutoffTime, activeDate);

  // Select all available meals within cutoff
  const handleSelectAllAvailable = () => {
    if (!isBreakfastCutoff) setSelectedBreakfast(true);
    if (!isLunchCutoff) setSelectedLunch(true);
    if (!isDinnerCutoff) setSelectedDinner(true);
    toast.success('Selected all available meals!');
  };

  // Confirm / Save Request
  const handleConfirmRequest = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/meals/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: activeDateStr,
          breakfast: selectedBreakfast,
          lunch: selectedLunch,
          dinner: selectedDinner,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit request');
      }

      setExistingRequest(data.request);
      setShowSuccessModal(true);
      toast.success('Meal request confirmed!');
      fetchMealData();
    } catch (err: any) {
      toast.error(err.message || 'Error submitting meal request');
    } finally {
      setSaving(false);
    }
  };

  const calculatedPoints =
    (selectedBreakfast ? 1 : 0) +
    (selectedLunch ? 2 : 0) +
    (selectedDinner ? 1 : 0);

  return (
    <div className="pb-28 pt-2 px-4 max-w-xl mx-auto">
      {/* 1. Greeting & Title Header */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-[#8B4513] tracking-wide uppercase">
          {getGreeting()}, {session?.user?.name || 'Friend'}! 👋
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] tracking-tight mt-0.5 leading-tight">
          What’s <span className="italic font-serif font-normal text-[#E67E22]">Your</span> Craving Today?
        </h1>
      </div>

      {/* 2. Point Balance Card */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-3xl p-5 bg-gradient-to-r from-[#1A1A2E] via-[#241F3D] to-[#1A1A2E] text-white shadow-xl relative overflow-hidden mb-5"
      >
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-[#E67E22]/20 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold tracking-wider text-[#FFDAB9] uppercase flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#E67E22]" /> Monthly Balance
          </span>
          <span className="text-[11px] bg-white/10 px-2.5 py-0.5 rounded-full font-medium text-gray-300">
            {activeDateStr.slice(0, 7)}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              <span>{userStats.balance}</span>
              <span className="text-sm font-semibold text-[#FFDAB9]">Points</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Available points for your meal requests
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs text-gray-300">
              Allocated: <strong className="text-white">{userStats.allocated}</strong>
            </div>
            <div className="text-xs text-gray-300 mt-0.5">
              Used: <strong className="text-[#FFDAB9]">{userStats.used}</strong>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Automatic Ordering Banner: Today's Meals OR Tomorrow's Meals */}
      <div className="mb-4">
        <div className={`p-4 rounded-3xl border shadow-sm flex items-center justify-between gap-3 ${
          isViewingTomorrow
            ? 'bg-[#FFF6ED] border-[#FFDAB9]'
            : 'bg-white border-[#F5E6D3]'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[#E67E22]" />
              <h2 className="font-extrabold text-base text-[#1A1A2E]">
                {isViewingTomorrow ? "Tomorrow's Meals" : "Today's Meals"}
              </h2>
              <span className="text-xs font-bold text-gray-500">
                ({format(activeDate, 'EEE, MMMM d')})
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {isViewingTomorrow
                ? "Today's dinner cutoff has passed. Select and update tomorrow's meals below within cutoff time."
                : "Select meals below. Orders can only be updated within cutoff times."}
            </p>
          </div>

          <button
            onClick={handleSelectAllAvailable}
            className="flex-shrink-0 py-2 px-3 bg-[#1A1A2E] hover:bg-black text-white rounded-2xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
          >
            <Zap size={13} className="text-[#E67E22]" />
            <span className="hidden sm:inline">Select All</span>
          </button>
        </div>
      </div>

      {/* 4. Meal Cards List (Only clean meal names + Radio button toggle) */}
      <div className="space-y-4">
        {/* Breakfast Card */}
        <MealCard
          type="breakfast"
          title="Breakfast"
          timeRange="07:00 AM - 09:00 AM"
          points={1}
          image={MEAL_ASSETS.breakfast}
          cutoffTime={cutoffs.breakfastCutoffTime}
          isPastCutoff={isBreakfastCutoff}
          isSelected={selectedBreakfast}
          isRequested={existingRequest?.breakfast || false}
          onToggle={() => setSelectedBreakfast(!selectedBreakfast)}
        />

        {/* Lunch Card */}
        <MealCard
          type="lunch"
          title="Lunch"
          timeRange="12:00 PM - 02:30 PM"
          points={2}
          image={MEAL_ASSETS.lunch}
          cutoffTime={cutoffs.lunchCutoffTime}
          isPastCutoff={isLunchCutoff}
          isSelected={selectedLunch}
          isRequested={existingRequest?.lunch || false}
          onToggle={() => setSelectedLunch(!selectedLunch)}
        />

        {/* Dinner Card */}
        <MealCard
          type="dinner"
          title="Dinner"
          timeRange="07:00 PM - 09:30 PM"
          points={1}
          image={MEAL_ASSETS.dinner}
          cutoffTime={cutoffs.dinnerCutoffTime}
          isPastCutoff={isDinnerCutoff}
          isSelected={selectedDinner}
          isRequested={existingRequest?.dinner || false}
          onToggle={() => setSelectedDinner(!selectedDinner)}
        />
      </div>

      {/* 5. Sticky Bottom Action Bar for Confirmation */}
      <div className="mt-6 p-4 rounded-3xl bg-white border border-[#F5E6D3] shadow-lg flex items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase font-bold text-gray-400 tracking-wider block">
            Selected Points
          </span>
          <div className="text-lg font-extrabold text-[#1A1A2E] flex items-center gap-1">
            <span>{calculatedPoints}</span>
            <span className="text-xs font-semibold text-[#8B4513]">Points Required</span>
          </div>
        </div>

        <button
          onClick={handleConfirmRequest}
          disabled={saving}
          className="py-3 px-6 rounded-2xl bg-[#1A1A2E] hover:bg-black text-white text-xs font-bold shadow-md transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
        >
          {saving ? (
            <span>Saving...</span>
          ) : (
            <>
              <span>Confirm Request</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-[#F5E6D3]"
            >
              <div className="w-16 h-16 rounded-full bg-[#27AE60]/10 text-[#27AE60] flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={36} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-extrabold text-[#1A1A2E]">
                Meal Request Confirmed!
              </h3>
              <p className="text-xs text-gray-500 mt-2">
                Your request for {format(activeDate, 'EEEE, MMMM d')} has been recorded with {calculatedPoints} points.
              </p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="mt-6 w-full py-3 bg-[#1A1A2E] text-white text-xs font-bold rounded-2xl shadow-md hover:bg-black transition"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isPast
} from 'date-fns';
import { Calendar, List, CheckCircle2, XCircle, Clock, Trash2, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { isPastCutoff, formatDateString } from '@/lib/utils';

export default function MealHistoryPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Admin users are strictly redirected to Admin Dashboard
  useEffect(() => {
    if (session && (session.user as any)?.role === 'admin') {
      router.replace('/admin/dashboard');
    }
  }, [session, router]);

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);

  const [meals, setMeals] = useState<any[]>([]);
  const [cutoffs, setCutoffs] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/meals?month=${selectedMonth}`);
      const data = await res.json();
      if (data.success) {
        setMeals(data.requests || []);
        if (data.cutoffs) setCutoffs(data.cutoffs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedMonth]);

  const handleCancelMeal = async (dateStr: string, mealType?: string) => {
    if (!confirm('Are you sure you want to cancel this meal request? Points will be refunded.')) {
      return;
    }

    try {
      setCancellingId(dateStr);
      const res = await fetch('/api/meals/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          mealType,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to cancel meal');
      }

      toast.success('Meal cancelled and points refunded.');
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message || 'Error cancelling meal');
    } finally {
      setCancellingId(null);
    }
  };

  const totalPointsUsed = meals
    .filter((m) => m.status !== 'cancelled')
    .reduce((sum, m) => sum + (m.totalPoints || 0), 0);

  // Calendar calculations
  const [yearStr, monthStr] = selectedMonth.split('-');
  const monthDate = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // Map meals by date
  const mealMap = new Map();
  meals.forEach((m) => {
    const key = formatDateString(new Date(m.date));
    mealMap.set(key, m);
  });

  return (
    <div className="pb-28 pt-2 px-4 max-w-xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
            Meal History
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Track daily orders, point usage, and calendar statuses
          </p>
        </div>

        {/* View Mode Toggle: List vs Calendar */}
        <div className="flex items-center bg-[#F5E6D3]/60 p-1 rounded-2xl border border-[#F5E6D3]">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              viewMode === 'list' ? 'bg-[#1A1A2E] text-white shadow-sm' : 'text-gray-600'
            }`}
            title="List View"
          >
            <List size={15} />
            <span className="hidden sm:inline">List</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
              viewMode === 'calendar' ? 'bg-[#1A1A2E] text-white shadow-sm' : 'text-gray-600'
            }`}
            title="Calendar View"
          >
            <Calendar size={15} />
            <span className="hidden sm:inline">Calendar</span>
          </button>
        </div>
      </div>

      {/* Monthly Summary Banner */}
      <div className="bg-gradient-to-r from-[#1A1A2E] to-[#2B2347] text-white p-5 rounded-3xl shadow-lg mb-6 flex items-center justify-between">
        <div>
          <span className="text-xs text-[#FFDAB9] font-bold uppercase tracking-wider block">
            Points Consumed
          </span>
          <div className="text-2xl font-black mt-0.5 text-white">
            {totalPointsUsed} <span className="text-xs font-semibold text-gray-300">Points in {selectedMonth}</span>
          </div>
        </div>

        {/* Month selector */}
        <div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#E67E22]"
          />
        </div>
      </div>

      {/* View Mode: CALENDAR VIEW */}
      {viewMode === 'calendar' ? (
        <div className="bg-white p-5 rounded-3xl border border-[#F5E6D3] shadow-sm mb-6">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <span key={d} className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day) => {
              const dayStr = formatDateString(day);
              const isCurrentMonth = isSameMonth(day, monthDate);
              const request = mealMap.get(dayStr);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedCalendarDate && isSameDay(day, selectedCalendarDate);

              // Dot status:
              // Green dot: Confirmed with points > 0
              // Red dot: Cancelled
              // Grey dot: In past, no request
              let dotColor = null;
              if (request) {
                if (request.status === 'confirmed' && request.totalPoints > 0) {
                  dotColor = 'bg-[#27AE60] ring-2 ring-[#27AE60]/30';
                } else if (request.status === 'cancelled') {
                  dotColor = 'bg-[#E74C3C] ring-2 ring-[#E74C3C]/30';
                }
              } else if (isCurrentMonth && isPast(day) && !isToday) {
                dotColor = 'bg-gray-300';
              }

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedCalendarDate(day)}
                  className={`h-14 rounded-2xl flex flex-col items-center justify-between p-1.5 transition border ${
                    !isCurrentMonth ? 'opacity-30 border-transparent' : 'border-[#F5E6D3]'
                  } ${
                    isSelected
                      ? 'bg-[#E67E22]/15 border-[#E67E22] ring-2 ring-[#E67E22]'
                      : isToday
                      ? 'bg-[#FFF8F0] border-[#E67E22]'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      isToday ? 'text-[#E67E22] font-extrabold' : 'text-[#1A1A2E]'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Dot status */}
                  <div className="h-2 flex items-center justify-center">
                    {dotColor && <span className={`w-2 h-2 rounded-full ${dotColor}`} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-[11px] text-gray-500 pt-4 mt-3 border-t border-gray-100 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#27AE60]" /> Requested
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E74C3C]" /> Cancelled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300" /> Missed / None
            </span>
          </div>

          {/* Selected Date Details Box */}
          {selectedCalendarDate && (
            <div className="mt-4 p-4 rounded-2xl bg-[#FFF8F0] border border-[#F5E6D3]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-[#1A1A2E]">
                  {format(selectedCalendarDate, 'EEEE, MMMM d, yyyy')}
                </span>
                {mealMap.get(formatDateString(selectedCalendarDate))?.totalPoints > 0 && (
                  <span className="text-xs font-bold text-[#E67E22]">
                    {mealMap.get(formatDateString(selectedCalendarDate)).totalPoints} Points
                  </span>
                )}
              </div>

              {(() => {
                const req = mealMap.get(formatDateString(selectedCalendarDate));
                if (!req || req.totalPoints === 0) {
                  return <p className="text-xs text-gray-500">No meals requested on this date.</p>;
                }
                return (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-700">
                      <span>Breakfast:</span>
                      <span className="font-semibold">{req.breakfast ? '✓ Requested (1 pt)' : '✗ Not selected'}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Lunch:</span>
                      <span className="font-semibold">{req.lunch ? '✓ Requested (2 pts)' : '✗ Not selected'}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Dinner:</span>
                      <span className="font-semibold">{req.dinner ? '✓ Requested (1 pt)' : '✗ Not selected'}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      ) : (
        /* View Mode: LIST VIEW */
        loading ? (
          <div className="py-12 text-center text-xs text-gray-500">Loading history...</div>
        ) : meals.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-[#F5E6D3] text-center text-gray-500">
            <Calendar size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-bold text-[#1A1A2E]">No requests found</p>
            <p className="text-xs text-gray-400 mt-1">You haven't requested any meals in this month.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.map((item) => {
              const dateObj = new Date(item.date);
              const dateStr = formatDateString(dateObj);
              const isCancelled = item.status === 'cancelled';
              const canCancelBreakfast = cutoffs && !isPastCutoff(cutoffs.breakfastCutoffTime, dateObj);

              return (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-3xl border transition-all ${
                    isCancelled
                      ? 'bg-gray-50 border-gray-200 opacity-60'
                      : 'bg-white border-[#F5E6D3] shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-[#1A1A2E]">
                        {format(dateObj, 'EEE, MMMM d, yyyy')}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          isCancelled
                            ? 'bg-red-100 text-red-600'
                            : 'bg-[#27AE60]/10 text-[#27AE60]'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <span className="text-xs font-black text-[#E67E22] bg-[#E67E22]/10 px-2.5 py-1 rounded-xl">
                      {item.totalPoints} pts
                    </span>
                  </div>

                  {/* Meals pill badges */}
                  <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
                    <span
                      className={`px-2.5 py-1 rounded-xl flex items-center gap-1 font-semibold ${
                        item.breakfast
                          ? 'bg-[#FFF8F0] border border-[#F5E6D3] text-[#8B4513]'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {item.breakfast ? '✓ Breakfast (1 pt)' : '✗ Breakfast'}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-xl flex items-center gap-1 font-semibold ${
                        item.lunch
                          ? 'bg-[#FFF6ED] border border-[#FFDAB9] text-[#E67E22]'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {item.lunch ? '✓ Lunch (2 pts)' : '✗ Lunch'}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-xl flex items-center gap-1 font-semibold ${
                        item.dinner
                          ? 'bg-[#FAF5F0] border border-[#EFE2D3] text-[#1A1A2E]'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {item.dinner ? '✓ Dinner (1 pt)' : '✗ Dinner'}
                    </span>
                  </div>

                  {/* Cancel option if before cutoff */}
                  {!isCancelled && item.totalPoints > 0 && canCancelBreakfast && (
                    <div className="mt-3 pt-2 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={() => handleCancelMeal(dateStr)}
                        disabled={cancellingId === dateStr}
                        className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-red-50 transition"
                      >
                        <Trash2 size={13} />
                        <span>{cancellingId === dateStr ? 'Cancelling...' : 'Cancel & Refund Points'}</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

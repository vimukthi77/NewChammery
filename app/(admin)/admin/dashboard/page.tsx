'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Users,
  UtensilsCrossed,
  Sparkles,
  BarChart3,
  Sliders,
  DollarSign,
  TrendingUp,
  UserPlus,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  WalletCards,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    todayBreakfast: 0,
    todayLunch: 0,
    todayDinner: 0,
    todayTotalRequests: 0,
    monthlyPointsUsed: 0,
  });

  const [treasury, setTreasury] = useState({
    totalStaffBalance: 0,
    currentAllocationBudget: 0,
    availableBalance: 0,
    staffCount: 0,
  });

  const [cutoffs, setCutoffs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const todayStr = new Date().toISOString().split('T')[0];
        const currentMonth = todayStr.slice(0, 7);

        const [usersRes, dailyRes, cutoffRes, treasuryRes, mealsRes] = await Promise.all([
          fetch('/api/users'),
          fetch(`/api/reports?type=daily&date=${todayStr}`),
          fetch('/api/settings/cutoff'),
          fetch('/api/admin/treasury'),
          fetch(`/api/meals?all=true&month=${currentMonth}`),
        ]);

        const [usersData, dailyData, cutoffData, treasuryData, mealsData] = await Promise.all([
          usersRes.json(),
          dailyRes.json(),
          cutoffRes.json(),
          treasuryRes.json(),
          mealsRes.json(),
        ]);

        const monthlyPoints = (mealsData.requests || [])
          .filter((m: any) => m.status !== 'cancelled')
          .reduce((sum: number, m: any) => sum + (m.totalPoints || 0), 0);

        setStats({
          totalUsers: usersData.users ? usersData.users.length : 0,
          todayBreakfast: dailyData.counts ? dailyData.counts.breakfast : 0,
          todayLunch: dailyData.counts ? dailyData.counts.lunch : 0,
          todayDinner: dailyData.counts ? dailyData.counts.dinner : 0,
          todayTotalRequests: dailyData.counts ? dailyData.counts.totalPoints : 0,
          monthlyPointsUsed: monthlyPoints,
        });

        if (treasuryData.success && treasuryData.treasury) {
          setTreasury(treasuryData.treasury);
        }

        if (cutoffData.success) {
          setCutoffs(cutoffData.settings);
        }
      } catch (err) {
        console.error('Error loading admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <div className="pb-28 pt-2 px-4 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#8B4513] uppercase tracking-wider">
            <ShieldCheck size={16} /> Admin Command Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] tracking-tight mt-0.5">
            Overview & Operations
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/treasury"
            className="py-2.5 px-4 bg-[#FFF8F0] hover:bg-[#F5E6D3] border border-[#F5E6D3] text-[#1A1A2E] text-xs font-bold rounded-2xl shadow-xs flex items-center gap-1.5 transition"
          >
            <WalletCards size={15} className="text-[#E67E22]" />
            <span>Money Summary</span>
          </Link>

          <Link
            href="/admin/users/add"
            className="py-2.5 px-4 bg-[#1A1A2E] hover:bg-black text-white text-xs font-bold rounded-2xl shadow-md flex items-center gap-1.5 transition"
          >
            <UserPlus size={16} />
            <span>Add User</span>
          </Link>
        </div>
      </div>

      {/* Chammery Treasury Money Card (Live User Balances - Budget = Available Reserve) */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#1A1A2E] via-[#2A1F44] to-[#1A1A2E] text-white shadow-xl relative overflow-hidden mb-6 border border-white/10"
      >
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-[#E67E22]/20 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="text-xs font-bold text-[#FFDAB9] uppercase tracking-wider flex items-center gap-1.5">
            <WalletCards size={15} className="text-[#E67E22]" />
            Chammery Treasury & Money Summary
          </span>

          <Link
            href="/admin/treasury"
            className="text-xs font-bold text-[#FFDAB9] hover:underline flex items-center gap-1"
          >
            <span>View Full Breakdown</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Box 1: Total Staff Balances Sum */}
          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
            <span className="text-[11px] font-bold text-gray-300 uppercase block">Total Staff Balances</span>
            <span className="text-xl sm:text-2xl font-black text-white mt-1 block">
              LKR {treasury.totalStaffBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5 block">
              {treasury.staffCount} staff member funds
            </span>
          </div>

          {/* Box 2: Month Allocation */}
          <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10">
            <span className="text-[11px] font-bold text-amber-200 uppercase block">This Month Budget</span>
            <span className="text-xl sm:text-2xl font-black text-amber-300 mt-1 block">
              - LKR {treasury.currentAllocationBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-gray-400 mt-0.5 block">
              Chammery allocated bill
            </span>
          </div>

          {/* Box 3: Net Available Reserve */}
          <div
            className={`p-3.5 rounded-2xl border ${
              treasury.availableBalance < 0
                ? 'bg-red-500/20 border-red-500/30'
                : 'bg-[#27AE60]/20 border-[#27AE60]/40'
            }`}
          >
            <span className="text-[11px] font-bold text-gray-200 uppercase block">Available Reserve</span>
            <span
              className={`text-xl sm:text-2xl font-black mt-1 block ${
                treasury.availableBalance < 0 ? 'text-red-400' : 'text-[#2ECC71]'
              }`}
            >
              LKR {treasury.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-gray-300 mt-0.5 block">
              {treasury.availableBalance < 0 ? 'Deficit / Needs Top-up' : 'Surplus Available'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Total Users */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white p-5 rounded-3xl border border-[#F5E6D3] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Total Users
            </span>
            <div className="text-2xl font-black text-[#1A1A2E] mt-1">
              {stats.totalUsers}
            </div>
            <Link
              href="/admin/users"
              className="text-[11px] font-bold text-[#E67E22] hover:underline flex items-center gap-0.5 mt-2"
            >
              <span>Manage users</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#E67E22]/10 text-[#E67E22] flex items-center justify-center font-bold">
            <Users size={24} />
          </div>
        </motion.div>

        {/* Today's Meals Requested */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-3xl border border-[#F5E6D3] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Today's Requests
            </span>
            <div className="text-2xl font-black text-[#1A1A2E] mt-1">
              {stats.todayBreakfast + stats.todayLunch + stats.todayDinner} <span className="text-xs font-normal text-gray-500">meals</span>
            </div>
            <Link
              href="/admin/meal-requests"
              className="text-[11px] font-bold text-[#E67E22] hover:underline flex items-center gap-0.5 mt-2"
            >
              <span>View details</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#27AE60]/10 text-[#27AE60] flex items-center justify-center font-bold">
            <UtensilsCrossed size={24} />
          </div>
        </motion.div>

        {/* Monthly Points Consumed */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-5 rounded-3xl border border-[#F5E6D3] shadow-sm flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Month Points Used
            </span>
            <div className="text-2xl font-black text-[#1A1A2E] mt-1">
              {stats.monthlyPointsUsed} <span className="text-xs font-semibold text-[#8B4513]">pts</span>
            </div>
            <Link
              href="/admin/allocation"
              className="text-[11px] font-bold text-[#E67E22] hover:underline flex items-center gap-0.5 mt-2"
            >
              <span>Calculate pricing</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#8B4513]/10 text-[#8B4513] flex items-center justify-center font-bold">
            <Sparkles size={24} />
          </div>
        </motion.div>
      </div>

      {/* Today's Kitchen Production Summary */}
      <div className="bg-white p-6 rounded-3xl border border-[#F5E6D3] shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-extrabold text-base text-[#1A1A2E]">
              Today’s Kitchen Production Summary
            </h3>
            <p className="text-xs text-gray-500">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <Link
            href="/admin/meal-requests"
            className="text-xs font-bold text-[#E67E22] hover:underline"
          >
            Full list &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#FFF8F0] p-4 rounded-2xl border border-[#F5E6D3] text-center">
            <span className="text-[11px] font-bold text-[#8B4513] uppercase tracking-wider block">
              Breakfast
            </span>
            <span className="text-2xl font-black text-[#1A1A2E] mt-1 block">
              {stats.todayBreakfast}
            </span>
            <span className="text-[10px] text-gray-500 mt-1 block">
              Cutoff: {cutoffs?.breakfastCutoffTime || '07:00'}
            </span>
          </div>

          <div className="bg-[#FFF6ED] p-4 rounded-2xl border border-[#FFDAB9] text-center">
            <span className="text-[11px] font-bold text-[#E67E22] uppercase tracking-wider block">
              Lunch
            </span>
            <span className="text-2xl font-black text-[#1A1A2E] mt-1 block">
              {stats.todayLunch}
            </span>
            <span className="text-[10px] text-gray-500 mt-1 block">
              Cutoff: {cutoffs?.lunchCutoffTime || '10:00'}
            </span>
          </div>

          <div className="bg-[#FAF5F0] p-4 rounded-2xl border border-[#EFE2D3] text-center">
            <span className="text-[11px] font-bold text-[#1A1A2E] uppercase tracking-wider block">
              Dinner
            </span>
            <span className="text-2xl font-black text-[#1A1A2E] mt-1 block">
              {stats.todayDinner}
            </span>
            <span className="text-[10px] text-gray-500 mt-1 block">
              Cutoff: {cutoffs?.dinnerCutoffTime || '15:00'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Quick Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href="/admin/treasury"
          className="bg-white p-4 rounded-2xl border border-[#F5E6D3] hover:border-[#E67E22] shadow-sm transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1A1A2E] to-[#2C2C4E] text-white group-hover:scale-110 flex items-center justify-center mb-2 transition">
            <WalletCards size={20} className="text-[#FFDAB9]" />
          </div>
          <span className="text-xs font-bold text-[#1A1A2E]">Money Summary</span>
          <span className="text-[10px] text-gray-500 mt-0.5">Treasury & Balances</span>
        </Link>

        <Link
          href="/admin/allocation"
          className="bg-white p-4 rounded-2xl border border-[#F5E6D3] hover:border-[#E67E22] shadow-sm transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#8B4513]/10 text-[#8B4513] group-hover:scale-110 flex items-center justify-center mb-2 transition">
            <TrendingUp size={20} />
          </div>
          <span className="text-xs font-bold text-[#1A1A2E]">Point Pricing</span>
          <span className="text-[10px] text-gray-500 mt-0.5">Budget & Cost</span>
        </Link>

        <Link
          href="/admin/topup"
          className="bg-white p-4 rounded-2xl border border-[#F5E6D3] hover:border-[#E67E22] shadow-sm transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#E67E22]/10 text-[#E67E22] group-hover:scale-110 flex items-center justify-center mb-2 transition">
            <DollarSign size={20} />
          </div>
          <span className="text-xs font-bold text-[#1A1A2E]">Topup Points</span>
          <span className="text-[10px] text-gray-500 mt-0.5">Bulk or single</span>
        </Link>

        <Link
          href="/admin/reports"
          className="bg-white p-4 rounded-2xl border border-[#F5E6D3] hover:border-[#E67E22] shadow-sm transition flex flex-col items-center text-center group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#27AE60]/10 text-[#27AE60] group-hover:scale-110 flex items-center justify-center mb-2 transition">
            <BarChart3 size={20} />
          </div>
          <span className="text-xs font-bold text-[#1A1A2E]">PDF Reports</span>
          <span className="text-[10px] text-gray-500 mt-0.5">Download & Export</span>
        </Link>
      </div>
    </div>
  );
}

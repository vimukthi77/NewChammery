'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { WalletCards, ArrowUpRight, ArrowDownLeft, Sparkles, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function UserBalancePage() {
  const [topups, setTopups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [usedPoints, setUsedPoints] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const topupRes = await fetch('/api/topup');
        const topupData = await topupRes.json();

        const mealsRes = await fetch('/api/meals');
        const mealsData = await mealsRes.json();

        if (topupData.success) {
          setTopups(topupData.topups || []);
          setTotalPoints(topupData.totalPoints || 0);
          setTotalAmount(topupData.totalAmount || 0);
        }

        if (mealsData.success && mealsData.userStats) {
          setUsedPoints(mealsData.userStats.used || 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const remainingBalance = totalPoints - usedPoints;
  const usagePercentage = totalPoints > 0 ? Math.min(100, Math.round((usedPoints / totalPoints) * 100)) : 0;

  return (
    <div className="pb-28 pt-2 px-4 max-w-xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
          Points & Balance
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Track your allocated meal points, expenses, and historical top-ups
        </p>
      </div>

      {/* Main Balance Hero Card */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-3xl p-6 bg-gradient-to-br from-[#1A1A2E] via-[#2A1E3C] to-[#1A1A2E] text-white shadow-2xl relative overflow-hidden mb-6 border border-white/10"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-[#FFDAB9] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#E67E22]" /> Available Points
          </span>
          <span className="text-xs bg-white/10 text-white px-2.5 py-0.5 rounded-full font-semibold">
            Active Account
          </span>
        </div>

        <div className="text-4xl font-extrabold tracking-tight mb-2">
          {remainingBalance} <span className="text-lg font-semibold text-[#FFDAB9]">PTS</span>
        </div>

        {/* Progress Bar of Points Usage */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-300 mb-1.5">
            <span>Points Consumption</span>
            <span className="font-bold text-white">{usagePercentage}% Used</span>
          </div>
          <div className="w-full bg-white/15 h-3 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#E67E22] to-[#FFDAB9] h-full rounded-full transition-all duration-500"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>

        {/* Stats Grid inside Hero */}
        <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-white/10">
          <div>
            <span className="text-[11px] text-gray-400 font-medium block">Total Allocated</span>
            <span className="text-lg font-extrabold text-white flex items-center gap-1">
              <ArrowDownLeft size={16} className="text-[#27AE60]" />
              {totalPoints} pts
            </span>
          </div>
          <div>
            <span className="text-[11px] text-gray-400 font-medium block">Total Consumed</span>
            <span className="text-lg font-extrabold text-white flex items-center gap-1">
              <ArrowUpRight size={16} className="text-[#E74C3C]" />
              {usedPoints} pts
            </span>
          </div>
        </div>
      </motion.div>

      {/* Topup History Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-[#1A1A2E]">
            Top-up History
          </h2>
          <span className="text-xs font-bold text-[#8B4513]">
            {topups.length} entries
          </span>
        </div>

        {loading ? (
          <div className="text-center py-8 text-xs text-gray-500">Loading topups...</div>
        ) : topups.length === 0 ? (
          <div className="bg-white p-6 rounded-3xl border border-[#F5E6D3] text-center text-gray-500">
            <WalletCards size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-bold text-[#1A1A2E]">No top-ups recorded</p>
            <p className="text-xs text-gray-400 mt-1">Your administrator has not added any top-up points yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topups.map((topup) => (
              <div
                key={topup._id}
                className="bg-white p-4 rounded-3xl border border-[#F5E6D3] shadow-sm flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#E67E22]/10 text-[#E67E22] flex items-center justify-center font-bold">
                    <ArrowDownLeft size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#1A1A2E]">
                      {topup.description || 'Monthly Allocation'}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {format(new Date(topup.createdAt), 'MMM d, yyyy • h:mm a')}
                    </p>
                    {topup.amount > 0 && (
                      <span className="text-[11px] font-semibold text-[#8B4513] block mt-0.5">
                        Amount: {formatCurrency(topup.amount)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-[#27AE60] bg-[#27AE60]/10 px-3 py-1.5 rounded-2xl inline-block">
                    +{topup.points} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


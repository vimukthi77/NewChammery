'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  DollarSign,
  Users,
  Coins,
  PlusCircle,
  MinusCircle,
  Clock,
  History,
  TrendingDown,
  TrendingUp,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

export default function AdminTopupPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [targetUser, setTargetUser] = useState<string>('all');
  const [isDeduction, setIsDeduction] = useState(false);
  const [points, setPoints] = useState('20');
  const [amount, setAmount] = useState('0');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [description, setDescription] = useState('Monthly meal point allocation');

  const fetchTopupData = async () => {
    try {
      setLoading(true);
      const [uRes, tRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/topup'),
      ]);

      const [uData, tData] = await Promise.all([uRes.json(), tRes.json()]);

      if (uData.success) setUsers(uData.users || []);
      if (tData.success) setTopups(tData.topups || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopupData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPts = Number(points);
    if (!parsedPts || parsedPts <= 0) {
      toast.error('Points must be a positive number');
      return;
    }

    if (isDeduction && !description) {
      toast.error('A reason/description is required for point deductions.');
      return;
    }

    const finalPoints = isDeduction ? -Math.abs(parsedPts) : Math.abs(parsedPts);

    try {
      setSaving(true);
      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUser,
          points: finalPoints,
          amount: Number(amount) || 0,
          month,
          description,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(
        targetUser === 'all'
          ? `Bulk allocated ${parsedPts} points to all users!`
          : `${isDeduction ? 'Deducted' : 'Added'} ${parsedPts} points successfully!`
      );

      // Reset form
      if (isDeduction) setIsDeduction(false);
      fetchTopupData();
    } catch (err: any) {
      toast.error(err.message || 'Error processing topup');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-28 pt-2 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
          Top-up & Points Management
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Allocate monthly meal points, perform bulk allocations, or make manual adjustments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-3xl border border-[#F5E6D3] shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-sm text-[#1A1A2E]">
                {isDeduction ? 'Manual Point Deduction' : 'Allocate Points'}
              </h3>

              {/* Mode Switcher */}
              <button
                type="button"
                onClick={() => {
                  setIsDeduction(!isDeduction);
                  if (!isDeduction && targetUser === 'all') {
                    // Deduction can only be individual
                    if (users.length > 0) setTargetUser(users[0]._id);
                  }
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-xl transition ${
                  isDeduction
                    ? 'bg-red-100 text-red-600'
                    : 'bg-[#27AE60]/10 text-[#27AE60]'
                }`}
              >
                {isDeduction ? 'Switch to Top-up' : 'Manual Deduction Mode'}
              </button>
            </div>

            {/* Recipient */}
            <div>
              <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                Recipient User
              </label>
              <select
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                className="w-full p-2.5 bg-[#FFF8F0] border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-semibold text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
              >
                {!isDeduction && (
                  <option value="all">🌟 All Active Users (Bulk Topup)</option>
                )}
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.remainingPoints || 0} pts balance)
                  </option>
                ))}
              </select>
            </div>

            {/* Points & Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                  Points {isDeduction ? 'to Deduct' : 'to Add'} *
                </label>
                <div className="relative flex items-center">
                  <Coins size={16} className="absolute left-3 text-gray-400" />
                  <input
                    type="number"
                    min="1"
                    required
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-bold text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                  Monetary Amount (LKR)
                </label>
                <div className="relative flex items-center">
                  <DollarSign size={16} className="absolute left-3 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-bold text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
                  />
                </div>
              </div>
            </div>

            {/* Month & Description */}
            <div>
              <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                Allocation Month
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full p-2 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs font-bold text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                Reason / Description *
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Monthly allocation - March 2025"
                className="w-full p-2.5 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className={`w-full py-3.5 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 ${
                isDeduction
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-[#1A1A2E] hover:bg-black'
              }`}
            >
              {saving ? (
                <span>Processing...</span>
              ) : isDeduction ? (
                <>
                  <MinusCircle size={16} />
                  <span>Deduct Points</span>
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  <span>Add Topup Allocation</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* History Column */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 rounded-3xl border border-[#F5E6D3] shadow-sm">
            <h3 className="font-extrabold text-sm text-[#1A1A2E] mb-4 flex items-center gap-2">
              <History size={16} className="text-[#E67E22]" />
              <span>Historical Top-up Log</span>
            </h3>

            {loading ? (
              <div className="text-center py-8 text-xs text-gray-500">Loading topups...</div>
            ) : topups.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No top-ups found.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {topups.map((t) => (
                  <div
                    key={t._id}
                    className="p-3.5 rounded-2xl bg-[#FFF8F0]/60 border border-[#F5E6D3]/70 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1A1A2E]">
                          {t.userId?.name || 'Staff User'}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          ({t.month})
                        </span>
                      </div>
                      <p className="text-gray-600 mt-0.5">{t.description}</p>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {format(new Date(t.createdAt), 'MMM d, yyyy • h:mm a')}
                      </span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`font-black text-sm px-2.5 py-1 rounded-xl inline-block ${
                          t.points >= 0
                            ? 'bg-[#27AE60]/10 text-[#27AE60]'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {t.points >= 0 ? `+${t.points}` : t.points} pts
                      </span>
                      {t.amount > 0 && (
                        <div className="text-[10px] text-gray-500 font-semibold mt-0.5">
                          {formatCurrency(t.amount)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


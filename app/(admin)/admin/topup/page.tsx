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
  FileText,
  AlertTriangle,
  Calendar,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

export default function AdminTopupPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [topups, setTopups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Mode: 'balance_topup' | 'set_balance' | 'missed_points' | 'deduction'
  const [formMode, setFormMode] = useState<'balance_topup' | 'set_balance' | 'missed_points' | 'deduction'>('balance_topup');
  const [targetUser, setTargetUser] = useState<string>('all');
  const [amount, setAmount] = useState('15000');
  const [points, setPoints] = useState('1');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [description, setDescription] = useState('Monthly meal balance allocation');

  const fetchTopupData = async () => {
    try {
      setLoading(true);
      const [uRes, tRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/topup'),
      ]);

      const [uData, tData] = await Promise.all([uRes.json(), tRes.json()]);

      if (uData.success) {
        setUsers(uData.users?.filter((u: any) => u.role === 'user') || []);
      }
      if (tData.success) {
        setTopups(tData.topups || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopupData();
  }, []);

  const handleModeChange = (mode: 'balance_topup' | 'set_balance' | 'missed_points' | 'deduction') => {
    setFormMode(mode);
    if (mode === 'balance_topup') {
      setDescription('Monthly meal balance allocation');
      setAmount('15000');
      setPoints('0');
    } else if (mode === 'set_balance') {
      setDescription('Admin direct balance adjustment');
      setAmount('15000');
      setPoints('0');
    } else if (mode === 'missed_points') {
      if (targetUser === 'all' && users.length > 0) {
        setTargetUser(users[0]._id);
      }
      setDescription('Missed meal points adjustment');
      setAmount('0');
      setPoints('1');
    } else if (mode === 'deduction') {
      if (targetUser === 'all' && users.length > 0) {
        setTargetUser(users[0]._id);
      }
      setDescription('Manual points deduction');
      setAmount('0');
      setPoints('1');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((formMode === 'missed_points' || formMode === 'deduction') && targetUser === 'all') {
      toast.error('Points adjustments must be assigned to an individual user.');
      return;
    }

    let payload: any = {
      userId: targetUser,
      month,
      description,
      date,
    };

    if (formMode === 'balance_topup') {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        toast.error('Please enter a valid top-up amount.');
        return;
      }
      payload.amount = parsedAmount;
      payload.points = 0;
      payload.type = 'topup';
    } else if (formMode === 'set_balance') {
      const parsedAmount = Number(amount);
      if (isNaN(parsedAmount)) {
        toast.error('Please enter a valid balance amount.');
        return;
      }
      payload.amount = parsedAmount;
      payload.points = 0;
      payload.type = 'set_balance';
    } else if (formMode === 'missed_points') {
      const parsedPoints = Number(points);
      if (!parsedPoints || parsedPoints <= 0) {
        toast.error('Please enter valid points (e.g. 1, 2, or 3).');
        return;
      }
      payload.amount = 0;
      payload.points = Math.abs(parsedPoints);
      payload.type = 'points_adjustment';
    } else if (formMode === 'deduction') {
      const parsedPoints = Number(points);
      if (!parsedPoints || parsedPoints <= 0) {
        toast.error('Please enter valid points to deduct.');
        return;
      }
      payload.amount = 0;
      payload.points = -Math.abs(parsedPoints);
      payload.type = 'points_adjustment';
    }

    try {
      setSaving(true);
      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(
        targetUser === 'all'
          ? `Bulk top-up processed for all users!`
          : `Transaction recorded successfully!`
      );

      fetchTopupData();
    } catch (err: any) {
      toast.error(err.message || 'Error processing transaction');
    } finally {
      setSaving(false);
    }
  };

  const selectedUserObj = users.find((u) => u._id === targetUser);

  return (
    <div className="pb-28 pt-2 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
          Top-up & Points Management
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Top up user monetary balances, add missed meal points, or perform bulk allocations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-3xl border border-[#F5E6D3] shadow-sm space-y-4"
          >
            {/* Mode Tabs */}
            <div>
              <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1.5">
                Action Type
              </label>
              <div className="grid grid-cols-4 gap-1 bg-[#FFF8F0] p-1 rounded-2xl border border-[#F5E6D3]">
                <button
                  type="button"
                  onClick={() => handleModeChange('balance_topup')}
                  className={`py-2 px-1 text-[10px] sm:text-[11px] font-bold rounded-xl transition ${
                    formMode === 'balance_topup'
                      ? 'bg-[#27AE60] text-white shadow-sm'
                      : 'text-gray-600 hover:text-[#1A1A2E]'
                  }`}
                >
                  + Topup
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('set_balance')}
                  className={`py-2 px-1 text-[10px] sm:text-[11px] font-bold rounded-xl transition ${
                    formMode === 'set_balance'
                      ? 'bg-[#1A1A2E] text-white shadow-sm'
                      : 'text-gray-600 hover:text-[#1A1A2E]'
                  }`}
                >
                  = Set Bal
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('missed_points')}
                  className={`py-2 px-1 text-[10px] sm:text-[11px] font-bold rounded-xl transition ${
                    formMode === 'missed_points'
                      ? 'bg-[#E67E22] text-white shadow-sm'
                      : 'text-gray-600 hover:text-[#1A1A2E]'
                  }`}
                >
                  + Points
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('deduction')}
                  className={`py-2 px-1 text-[10px] sm:text-[11px] font-bold rounded-xl transition ${
                    formMode === 'deduction'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-[#1A1A2E]'
                  }`}
                >
                  - Deduct
                </button>
              </div>
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
                {(formMode === 'balance_topup' || formMode === 'set_balance') && (
                  <option value="all">🌟 All Active Users (Bulk {formMode === 'set_balance' ? 'Set Balance' : 'Topup'})</option>
                )}
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} — Balance: LKR {(u.balance ?? 0).toLocaleString()} ({u.usedPoints || 0} pts used)
                  </option>
                ))}
              </select>
            </div>

            {/* Active User Balance Peek */}
            {selectedUserObj && (
              <div className="p-3 rounded-2xl bg-[#FFF8F0] border border-[#F5E6D3] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-semibold">Current Balance:</span>
                  <span
                    className={`font-black ${
                      (selectedUserObj.balance ?? 0) <= 0 ? 'text-red-600' : 'text-[#27AE60]'
                    }`}
                  >
                    LKR {(selectedUserObj.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>Period Points Used:</span>
                  <strong className="text-[#E67E22]">{selectedUserObj.usedPoints || 0} pts</strong>
                </div>
              </div>
            )}

            {/* Form Fields: Balance Topup Mode */}
            {formMode === 'balance_topup' && (
              <div>
                <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                  Top-up Monetary Amount to Add (LKR) *
                </label>
                <div className="relative flex items-center">
                  <DollarSign size={16} className="absolute left-3 text-[#27AE60]" />
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="15000"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-black text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAmount('15000')}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#FFF8F0] border border-[#F5E6D3] text-gray-700 hover:bg-gray-100"
                  >
                    15,000 LKR
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount('10000')}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#FFF8F0] border border-[#F5E6D3] text-gray-700 hover:bg-gray-100"
                  >
                    10,000 LKR
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount('5000')}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#FFF8F0] border border-[#F5E6D3] text-gray-700 hover:bg-gray-100"
                  >
                    5,000 LKR
                  </button>
                </div>
              </div>
            )}

            {/* Form Fields: Set Exact Balance Mode */}
            {formMode === 'set_balance' && (
              <div>
                <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                  Target Exact Balance (LKR) *
                </label>
                <div className="relative flex items-center">
                  <DollarSign size={16} className="absolute left-3 text-[#1A1A2E]" />
                  <input
                    type="number"
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="15000"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-black text-[#1A1A2E] focus:ring-2 focus:ring-[#1A1A2E]"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAmount('15000')}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#FFF8F0] border border-[#F5E6D3] text-gray-700 hover:bg-gray-100"
                  >
                    Set 15,000 LKR
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount('20000')}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#FFF8F0] border border-[#F5E6D3] text-gray-700 hover:bg-gray-100"
                  >
                    Set 20,000 LKR
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount('10000')}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#FFF8F0] border border-[#F5E6D3] text-gray-700 hover:bg-gray-100"
                  >
                    Set 10,000 LKR
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount('0')}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                  >
                    Reset 0 LKR
                  </button>
                </div>
              </div>
            )}

            {/* Form Fields: Missed Points / Deduction Mode */}
            {(formMode === 'missed_points' || formMode === 'deduction') && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                    Points {formMode === 'deduction' ? 'to Deduct' : 'to Add'} *
                  </label>
                  <div className="relative flex items-center">
                    <Coins size={16} className="absolute left-3 text-[#E67E22]" />
                    <input
                      type="number"
                      min="1"
                      required
                      value={points}
                      onChange={(e) => setPoints(e.target.value)}
                      placeholder="1"
                      className="w-full pl-9 pr-3 py-2 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-bold text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-500 font-semibold">
                    <span>Quick:</span>
                    <button
                      type="button"
                      onClick={() => setPoints('1')}
                      className="px-2 py-0.5 rounded bg-[#FFF8F0] border border-[#F5E6D3]"
                    >
                      +1 (Breakfast / Dinner)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPoints('2')}
                      className="px-2 py-0.5 rounded bg-[#FFF8F0] border border-[#F5E6D3]"
                    >
                      +2 (Lunch)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                    Effective Meal Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-2 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs font-bold text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
                  />
                </div>
              </div>
            )}

            {/* Month & Description */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                  Month
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
                  Reason / Note *
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Monthly Topup"
                  className="w-full p-2 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className={`w-full py-3.5 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 ${
                formMode === 'deduction'
                  ? 'bg-red-600 hover:bg-red-700'
                  : formMode === 'missed_points'
                  ? 'bg-[#E67E22] hover:bg-[#D35400]'
                  : formMode === 'set_balance'
                  ? 'bg-[#1A1A2E] hover:bg-black'
                  : 'bg-[#27AE60] hover:bg-[#219653]'
              }`}
            >
              {saving ? (
                <span>Processing...</span>
              ) : formMode === 'deduction' ? (
                <>
                  <MinusCircle size={16} />
                  <span>Deduct Points</span>
                </>
              ) : formMode === 'missed_points' ? (
                <>
                  <PlusCircle size={16} />
                  <span>Add Missed Points</span>
                </>
              ) : formMode === 'set_balance' ? (
                <>
                  <DollarSign size={16} />
                  <span>Save Exact Balance</span>
                </>
              ) : (
                <>
                  <DollarSign size={16} />
                  <span>Apply Balance Top-up</span>
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
              <span>Top-up & Points Audit Log</span>
            </h3>

            {loading ? (
              <div className="text-center py-8 text-xs text-gray-500">Loading records...</div>
            ) : topups.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No transaction logs found.</p>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
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
                        {t.type && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-gray-100 text-gray-600">
                            {t.type.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mt-0.5">{t.description}</p>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {format(new Date(t.createdAt), 'MMM d, yyyy • h:mm a')}
                      </span>
                    </div>

                    <div className="text-right">
                      {t.amount !== 0 && (
                        <div
                          className={`font-black text-sm ${
                            t.amount > 0 ? 'text-[#27AE60]' : 'text-red-600'
                          }`}
                        >
                          {t.amount > 0 ? `+${formatCurrency(t.amount)}` : formatCurrency(t.amount)}
                        </div>
                      )}
                      {t.points !== 0 && (
                        <span
                          className={`font-bold text-xs px-2 py-0.5 rounded-md inline-block mt-0.5 ${
                            t.points > 0
                              ? 'bg-[#E67E22]/10 text-[#E67E22]'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {t.points > 0 ? `+${t.points}` : t.points} pts
                        </span>
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

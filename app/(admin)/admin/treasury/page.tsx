'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  WalletCards,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Users,
  AlertTriangle,
  CheckCircle2,
  Download,
  Calendar,
  PlusCircle,
  Search,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Coins,
  Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminTreasuryPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // Topup Modal State
  const [topupModalUser, setTopupModalUser] = useState<any>(null); // null = closed, 'all' = bulk, userObj = single
  const [topupAmount, setTopupAmount] = useState('15000');
  const [topupDesc, setTopupDesc] = useState('Monthly meal balance allocation');
  const [submittingTopup, setSubmittingTopup] = useState(false);

  const fetchTreasury = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetch(`/api/admin/treasury?month=${month}`);
      const resData = await res.json();
      if (resData.success) {
        setData(resData);
      } else {
        toast.error(resData.error || 'Failed to load treasury data');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Network error loading treasury summary');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTreasury();
  }, [month]);

  const handleOpenTopup = (target: any) => {
    setTopupModalUser(target);
    setTopupAmount('15000');
    setTopupDesc(
      target === 'all'
        ? `Bulk monthly balance allocation - ${month}`
        : `Balance top-up for ${target.name}`
    );
  };

  const handleExecuteTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Number(topupAmount);
    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Please enter a valid monetary amount.');
      return;
    }

    try {
      setSubmittingTopup(true);
      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: topupModalUser === 'all' ? 'all' : topupModalUser._id,
          amount: parsedAmount,
          points: 0,
          type: 'topup',
          month,
          description: topupDesc,
        }),
      });

      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error);

      toast.success(
        topupModalUser === 'all'
          ? `Bulk top-up of ${formatCurrency(parsedAmount)} applied to all staff!`
          : `Top-up of ${formatCurrency(parsedAmount)} added for ${topupModalUser.name}!`
      );

      setTopupModalUser(null);
      fetchTreasury(true);
    } catch (err: any) {
      toast.error(err.message || 'Error processing top-up');
    } finally {
      setSubmittingTopup(false);
    }
  };

  const handleDownloadTreasuryPDF = () => {
    if (!data) return;
    try {
      const doc = new jsPDF();
      const t = data.treasury;

      // Header Banner
      doc.setFillColor(26, 26, 46);
      doc.rect(0, 0, 210, 36, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CHAMMERY TREASURY & MONEY SUMMARY', 14, 18);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 218, 185);
      doc.text(`Financial Health, Balances & Reserves Overview — ${month}`, 14, 27);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 140, 27);

      // KPI Box
      let yPos = 46;
      doc.setTextColor(26, 26, 46);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`CHAMMERY TREASURY SUMMARY (${month})`, 14, yPos);

      autoTable(doc, {
        startY: yPos + 4,
        head: [['Total Staff Balances Pool', 'This Month Chammery Budget', 'Net Available Reserve', 'Estimated Point Price']],
        body: [
          [
            `LKR ${t.totalStaffBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            `LKR ${t.currentAllocationBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            `LKR ${t.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            `LKR ${t.estimatedPointPrice.toFixed(2)} / pt`,
          ],
        ],
        theme: 'striped',
        headStyles: { fillColor: [230, 126, 34], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4, halign: 'center' },
      });

      // User Breakdown
      const finalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 26, 46);
      doc.text('INDIVIDUAL STAFF MONETARY BALANCES & CONSUMPTION', 14, finalY);

      const tableData = (data.users || []).map((u: any, idx: number) => [
        idx + 1,
        u.name || 'Staff User',
        u.email || 'N/A',
        `LKR ${(u.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        `${u.pointsThisMonth || 0} pts`,
        `LKR ${(u.estimatedCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        `LKR ${(u.projectedBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        u.balance <= 0 ? 'DEFICIT' : (u.balance < 3000 ? 'LOW' : 'HEALTHY'),
      ]);

      autoTable(doc, {
        startY: finalY + 4,
        head: [['#', 'Staff Name', 'Email', 'Current Balance', 'Month Points', 'Est. Cost', 'Projected Bal', 'Status']],
        body: tableData.length > 0 ? tableData : [['-', 'No staff members found', '-', '-', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [26, 26, 46], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3 },
      });

      doc.save(`Chammery_Treasury_Summary_${month}.pdf`);
      toast.success('Treasury Summary PDF downloaded!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to generate Treasury PDF');
    }
  };

  const treasury = data?.treasury;
  const filteredUsers = (data?.users || []).filter((u: any) => {
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="pb-28 pt-2 px-4 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#E67E22] uppercase tracking-wider">
            <WalletCards size={16} /> Chammery Financial Treasury
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A2E] tracking-tight mt-0.5">
            Money & Balances Summary
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time calculation of total user balances, monthly mess allocation deduction, and net available reserve.
          </p>
        </div>

        {/* Controls: Month selector, Refresh, PDF */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="p-2 bg-white border border-[#F5E6D3] rounded-2xl text-xs font-bold text-[#1A1A2E] shadow-sm focus:ring-2 focus:ring-[#E67E22] cursor-pointer"
          />

          <button
            onClick={() => fetchTreasury(true)}
            disabled={refreshing}
            className="p-2.5 rounded-2xl bg-white border border-[#F5E6D3] text-[#1A1A2E] hover:bg-[#FFF8F0] shadow-sm transition"
            title="Refresh Treasury"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleDownloadTreasuryPDF}
            className="px-3.5 py-2.5 bg-[#FFF8F0] hover:bg-[#F5E6D3] border border-[#F5E6D3] text-[#1A1A2E] text-xs font-bold rounded-2xl shadow-sm transition flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>PDF</span>
          </button>

          <button
            onClick={() => handleOpenTopup('all')}
            className="px-4 py-2.5 bg-[#1A1A2E] hover:bg-black text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center gap-1.5 active:scale-95"
          >
            <PlusCircle size={15} className="text-[#E67E22]" />
            <span>Bulk Top-Up All</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-[#E67E22] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-gray-500">Calculating Chammery Treasury & User Balances...</p>
        </div>
      ) : treasury ? (
        <>
          {/* Giant Treasury Equation Banner (Matches User's Example) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-[#1A1A2E] via-[#2A1F44] to-[#1A1A2E] text-white shadow-2xl relative overflow-hidden mb-6 border border-white/10"
          >
            <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-[#E67E22]/20 blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <span className="text-xs font-bold text-[#FFDAB9] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#E67E22]" />
                Live Chammery Treasury Formula
              </span>
              <span className="text-[11px] bg-white/10 px-3 py-1 rounded-full font-bold text-gray-300">
                Period: {month}
              </span>
            </div>

            {/* Visual Equation: [Staff Pool] - [This Month Allocation] = [Available Reserve] */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Box 1: Total Staff Balances Pool */}
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <span className="text-[11px] font-bold text-gray-300 uppercase block">
                  1. Total Staff Balances Sum
                </span>
                <span className="text-2xl sm:text-3xl font-black text-white mt-1 block tracking-tight">
                  LKR {treasury.totalStaffBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Sum of all {treasury.staffCount} staff member accounts
                </span>
              </div>

              {/* Box 2: Monthly Allocation Deduction */}
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <span className="text-[11px] font-bold text-amber-200 uppercase block">
                  2. This Month Allocation
                </span>
                <span className="text-2xl sm:text-3xl font-black text-amber-300 mt-1 block tracking-tight">
                  - LKR {treasury.currentAllocationBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Chammery mess / operational catering budget
                </span>
              </div>

              {/* Box 3: Net Available Reserve */}
              <div
                className={`p-4 rounded-2xl backdrop-blur-md border ${
                  treasury.availableBalance < 0
                    ? 'bg-red-500/20 border-red-500/30'
                    : 'bg-[#27AE60]/20 border-[#27AE60]/40'
                }`}
              >
                <span className="text-[11px] font-bold text-gray-200 uppercase block">
                  3. Net Available Reserve
                </span>
                <span
                  className={`text-2xl sm:text-3xl font-black mt-1 block tracking-tight ${
                    treasury.availableBalance < 0 ? 'text-red-400' : 'text-[#2ECC71]'
                  }`}
                >
                  LKR {treasury.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-gray-300 mt-1 block">
                  {treasury.availableBalance < 0
                    ? '⚠️ Deficit! Top-ups needed to cover mess budget'
                    : '✅ Healthy surplus remaining in treasury'}
                </span>
              </div>
            </div>

            {/* Formula Explanation Callout */}
            <div className="mt-5 pt-4 border-t border-white/10 text-xs text-gray-300 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-[#FFDAB9] font-bold">Calculation:</span>
                <span>
                  LKR {treasury.totalStaffBalance.toLocaleString()} (Staff Sum) - LKR {treasury.currentAllocationBudget.toLocaleString()} (Allocation) =
                </span>
                <strong className={treasury.availableBalance < 0 ? 'text-red-400' : 'text-[#2ECC71]'}>
                  LKR {treasury.availableBalance.toLocaleString()} Available
                </strong>
              </div>

              <span className="text-[11px] text-gray-400">
                New top-ups immediately increment Staff Sum & Available Reserve
              </span>
            </div>
          </motion.div>

          {/* Secondary Financial KPI Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white p-4 rounded-2xl border border-[#F5E6D3] shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Points This Month</span>
              <span className="text-xl font-black text-[#E67E22] mt-0.5 block">
                {treasury.totalPointsThisMonth} pts
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5 block">Total consumed meals</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#F5E6D3] shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Est. 1 Point Price</span>
              <span className="text-xl font-black text-amber-900 mt-0.5 block">
                LKR {treasury.estimatedPointPrice.toFixed(2)}
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5 block">Budget / Points consumed</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#F5E6D3] shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Accounts in Deficit</span>
              <span className={`text-xl font-black mt-0.5 block ${treasury.deficitCount > 0 ? 'text-red-600' : 'text-[#27AE60]'}`}>
                {treasury.deficitCount} users
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5 block">
                {treasury.deficitCount > 0 ? `Total deficit: LKR ${treasury.totalDeficitAmount.toLocaleString()}` : 'No accounts blocked'}
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-[#F5E6D3] shadow-sm">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Active Staff Pool</span>
              <span className="text-xl font-black text-[#1A1A2E] mt-0.5 block">
                {treasury.staffCount} staff
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5 block">Registered dining users</span>
            </div>
          </div>

          {/* Individual Staff Balances Breakdown Card */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#F5E6D3] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-extrabold text-base text-[#1A1A2E] flex items-center gap-2">
                  <Users size={18} className="text-[#E67E22]" />
                  <span>Staff Monetary Balances & Consumption</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Detailed view of each user’s balance contribution, month points, and projected cost.
                </p>
              </div>

              {/* Search */}
              <div className="relative min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search staff name..."
                  className="w-full pl-8 pr-3 py-2 bg-[#FFF8F0]/70 border border-[#F5E6D3] rounded-2xl text-xs text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-[#FFF8F0]/70 text-gray-600 font-extrabold uppercase">
                    <th className="py-2.5 px-3">Staff Member</th>
                    <th className="py-2.5 px-3 text-right">Current Balance</th>
                    <th className="py-2.5 px-3 text-center">Month Points</th>
                    <th className="py-2.5 px-3 text-right">Est. Meal Cost</th>
                    <th className="py-2.5 px-3 text-right">Projected Balance</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">
                        No staff members found matching "{search}".
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u: any) => {
                      const isDef = u.balance <= 0;
                      return (
                        <tr key={u._id} className="hover:bg-[#FFF8F0]/40 transition">
                          <td className="py-3 px-3">
                            <strong className="text-[#1A1A2E] block">{u.name}</strong>
                            <span className="text-[11px] text-gray-400">{u.email}</span>
                          </td>
                          <td className={`py-3 px-3 text-right font-black ${isDef ? 'text-red-600' : 'text-[#27AE60]'}`}>
                            LKR {u.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-[#E67E22]">
                            {u.pointsThisMonth} pts
                          </td>
                          <td className="py-3 px-3 text-right text-gray-600 font-semibold">
                            LKR {u.estimatedCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-black ${
                              u.projectedBalance <= 0 ? 'text-red-600' : 'text-[#1A1A2E]'
                            }`}
                          >
                            LKR {u.projectedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                                isDef
                                  ? 'bg-red-100 text-red-600 border border-red-200'
                                  : u.balance < 3000
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-[#27AE60]/10 text-[#27AE60]'
                              }`}
                            >
                              {isDef ? 'Deficit' : u.balance < 3000 ? 'Low' : 'Healthy'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleOpenTopup(u)}
                              className="text-[10px] font-bold px-2.5 py-1 bg-[#1A1A2E] hover:bg-black text-white rounded-xl shadow-xs transition"
                            >
                              Top Up
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {/* Topup Modal */}
      <AnimatePresence>
        {topupModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-[#F5E6D3]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <h3 className="font-extrabold text-base text-[#1A1A2E] flex items-center gap-2">
                  <DollarSign size={18} className="text-[#27AE60]" />
                  <span>
                    {topupModalUser === 'all'
                      ? 'Bulk Top-up for All Active Staff'
                      : `Top Up ${topupModalUser.name}`}
                  </span>
                </h3>
              </div>

              <form onSubmit={handleExecuteTopup} className="space-y-4">
                {topupModalUser !== 'all' && (
                  <div className="p-3 rounded-2xl bg-[#FFF8F0] border border-[#F5E6D3] text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Current Balance:</span>
                      <strong className={topupModalUser.balance <= 0 ? 'text-red-600' : 'text-[#27AE60]'}>
                        LKR {topupModalUser.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                    Top-up Amount (LKR) *
                  </label>
                  <div className="relative flex items-center">
                    <DollarSign size={16} className="absolute left-3 text-[#27AE60]" />
                    <input
                      type="number"
                      min="1"
                      required
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="15000"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-sm font-black text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22] focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setTopupAmount('15000')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#FFF8F0] border border-[#F5E6D3] text-gray-700 hover:bg-gray-100"
                    >
                      15,000 LKR
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopupAmount('10000')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#FFF8F0] border border-[#F5E6D3] text-gray-700 hover:bg-gray-100"
                    >
                      10,000 LKR
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopupAmount('5000')}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#FFF8F0] border border-[#F5E6D3] text-gray-700 hover:bg-gray-100"
                    >
                      5,000 LKR
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                    Description / Note
                  </label>
                  <input
                    type="text"
                    required
                    value={topupDesc}
                    onChange={(e) => setTopupDesc(e.target.value)}
                    className="w-full p-2.5 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTopupModalUser(null)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-2xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingTopup}
                    className="flex-1 py-3 bg-[#1A1A2E] hover:bg-black text-white text-xs font-bold rounded-2xl shadow-md transition disabled:opacity-50"
                  >
                    {submittingTopup ? 'Applying...' : 'Confirm Top-Up'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

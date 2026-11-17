'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  TrendingUp,
  Calculator,
  Lock,
  Calendar,
  Sparkles,
  DollarSign,
  PieChart,
  CheckCircle2,
  Download,
  AlertTriangle,
  History,
  FileSpreadsheet,
  Users,
  Coins,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminAllocationPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0)).toISOString().split('T')[0];
  });
  const [totalBudget, setTotalBudget] = useState('300000');
  const [preview, setPreview] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/allocation');
      const data = await res.json();
      if (data.success) {
        setAllocations(data.allocations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  // Quick month selector helpers
  const handleSelectCurrentMonth = () => {
    const d = new Date();
    setDateFrom(new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().split('T')[0]);
    setDateTo(new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0)).toISOString().split('T')[0]);
    setPreview(null);
  };

  const handleSelectPreviousMonth = () => {
    const d = new Date();
    setDateFrom(new Date(Date.UTC(d.getFullYear(), d.getMonth() - 1, 1)).toISOString().split('T')[0]);
    setDateTo(new Date(Date.UTC(d.getFullYear(), d.getMonth(), 0)).toISOString().split('T')[0]);
    setPreview(null);
  };

  // Step 1: Calculate Settlement Preview
  const handleCalculatePreview = async () => {
    if (!dateFrom || !dateTo || !totalBudget) {
      toast.error('Please specify dates and total allocation budget.');
      return;
    }

    try {
      setCalculating(true);
      const res = await fetch('/api/allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom,
          dateTo,
          totalBudget: Number(totalBudget),
          isPreview: true,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setPreview(data.preview);
      toast.success('Settlement preview calculated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Error calculating preview');
    } finally {
      setCalculating(false);
    }
  };

  // Step 2: Finalize & Deduct Balances
  const handleFinalizeSettlement = async () => {
    if (!preview) {
      toast.error('Please calculate settlement preview first.');
      return;
    }

    try {
      setFinalizing(true);
      const res = await fetch('/api/allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom,
          dateTo,
          totalBudget: Number(totalBudget),
          finalize: true,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Month settlement finalized! Balances updated.');
      setShowConfirmModal(false);
      fetchAllocations();
      // Auto-trigger PDF download for the freshly finalized settlement
      handleDownloadPDF(data.allocation || preview);
    } catch (err: any) {
      toast.error(err.message || 'Error finalizing settlement');
    } finally {
      setFinalizing(false);
    }
  };

  // Step 3: Generate & Download Official Settlement PDF
  const handleDownloadPDF = (data: any) => {
    try {
      const doc = new jsPDF();
      const budget = Number(data.totalBudget || 0);
      const points = Number(data.totalPointsUsed || 0);
      const pointPrice = Number(data.pointPrice || 0);
      const breakdown = data.userBreakdown || [];

      // Document Header
      doc.setFillColor(26, 26, 46); // #1A1A2E
      doc.rect(0, 0, 210, 36, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CHAMMERY MEAL MANAGEMENT', 14, 18);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 218, 185); // #FFDAB9
      doc.text(`Monthly Allocation & Expense Settlement Report`, 14, 27);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 140, 27);

      // Period & Summary KPI Box
      let yPos = 44;
      doc.setTextColor(26, 26, 46);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`SETTLEMENT PERIOD: ${format(new Date(data.dateFrom), 'MMM d, yyyy')} — ${format(new Date(data.dateTo), 'MMM d, yyyy')}`, 14, yPos);

      autoTable(doc, {
        startY: yPos + 4,
        head: [['Total Chammery Budget', 'Total Points Consumed', 'Calculated 1 Point Price', 'Staff Users Settled']],
        body: [
          [
            `LKR ${budget.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            `${points} pts`,
            `LKR ${pointPrice.toFixed(2)} / pt`,
            `${breakdown.length} Staff Members`,
          ],
        ],
        theme: 'striped',
        headStyles: { fillColor: [230, 126, 34], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4, halign: 'center' },
      });

      // Individual Master Roster Table
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 26, 46);
      doc.text('INDIVIDUAL STAFF MEAL DEDUCTIONS & BALANCES', 14, finalY);

      const tableData = breakdown.map((u: any, idx: number) => {
        const isDeficit = (u.newBalance ?? 0) <= 0;
        return [
          idx + 1,
          u.name || 'Staff Member',
          u.email || 'N/A',
          `${u.pointsUsed || 0} pts`,
          `LKR ${(u.deductionAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          `LKR ${(u.previousBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          `LKR ${(u.newBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
          isDeficit ? 'DEFICIT' : 'ACTIVE',
        ];
      });

      autoTable(doc, {
        startY: finalY + 4,
        head: [['#', 'Staff Name', 'Email', 'Points', 'Meal Cost', 'Prev Balance', 'New Balance', 'Status']],
        body: tableData.length > 0 ? tableData : [['-', 'No active users found', '-', '-', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [26, 26, 46], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3 },
      });

      // Footer sign-off
      const endY = (doc as any).lastAutoTable.finalY + 16;
      if (endY < 270) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('Prepared By: ______________________      Authorized By: ______________________', 14, endY);
      }

      const fileDate = format(new Date(data.dateFrom), 'yyyy-MM');
      doc.save(`Chammery_Monthly_Settlement_${fileDate}.pdf`);
      toast.success('Official Settlement Report (PDF) downloaded!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to generate PDF report');
    }
  };

  return (
    <div className="pb-28 pt-2 px-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
          Monthly Mess Allocation & Settlement
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Enter total monthly catering bill, calculate price per point, and apply meal cost deductions across all users.
        </p>
      </div>

      {/* Main Calculation & Allocation Input Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#F5E6D3] shadow-sm mb-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4 flex-wrap gap-2">
          <h2 className="font-extrabold text-sm sm:text-base text-[#1A1A2E] flex items-center gap-2">
            <Calculator size={18} className="text-[#E67E22]" />
            <span>Generate Monthly Settlement</span>
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectCurrentMonth}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#FFF8F0] border border-[#F5E6D3] text-gray-700 hover:bg-gray-100 transition"
            >
              This Month
            </button>
            <button
              type="button"
              onClick={handleSelectPreviousMonth}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-[#FFF8F0] border border-[#F5E6D3] text-gray-700 hover:bg-gray-100 transition"
            >
              Last Month
            </button>
          </div>
        </div>

        {/* Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1.5">
              Period Start Date *
            </label>
            <input
              type="date"
              required
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPreview(null);
              }}
              className="w-full p-2.5 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-bold text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1.5">
              Period End Date *
            </label>
            <input
              type="date"
              required
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPreview(null);
              }}
              className="w-full p-2.5 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-bold text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1.5">
              Chammery Allocated Amount (LKR) *
            </label>
            <div className="relative flex items-center">
              <DollarSign size={16} className="absolute left-3 text-[#27AE60]" />
              <input
                type="number"
                min="0"
                required
                value={totalBudget}
                onChange={(e) => {
                  setTotalBudget(e.target.value);
                  setPreview(null);
                }}
                placeholder="300000"
                className="w-full pl-9 pr-3 py-2.5 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-black text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Calculate Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={calculating}
            onClick={handleCalculatePreview}
            className="w-full sm:w-auto py-3 px-6 bg-[#1A1A2E] hover:bg-black text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <Calculator size={16} />
            <span>{calculating ? 'Calculating Points & Price...' : 'Calculate Settlement Preview'}</span>
          </button>
        </div>
      </div>

      {/* Preview Section */}
      {preview && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-[#E67E22]/40 shadow-lg mb-6"
        >
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-5 flex-wrap gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#E67E22] bg-[#E67E22]/10 px-2.5 py-1 rounded-full">
                Settlement Estimation
              </span>
              <h3 className="font-extrabold text-base text-[#1A1A2E] mt-1">
                Settlement Results: {format(new Date(preview.dateFrom), 'MMM d, yyyy')} to {format(new Date(preview.dateTo), 'MMM d, yyyy')}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadPDF(preview)}
                className="py-2.5 px-4 bg-[#FFF8F0] hover:bg-[#F5E6D3] border border-[#F5E6D3] text-[#1A1A2E] text-xs font-bold rounded-2xl transition flex items-center gap-1.5"
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="py-2.5 px-5 bg-[#E67E22] hover:bg-[#D35400] text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center gap-1.5 active:scale-95"
              >
                <Lock size={14} />
                <span>Finalize & Deduct Balances</span>
              </button>
            </div>
          </div>

          {/* KPI Banner Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-4 rounded-2xl bg-[#FFF8F0] border border-[#F5E6D3]">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Chammery Budget</span>
              <span className="text-lg font-black text-[#1A1A2E] mt-0.5 block">
                {formatCurrency(preview.totalBudget)}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF8F0] border border-[#F5E6D3]">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Total Points Consumed</span>
              <span className="text-lg font-black text-[#E67E22] mt-0.5 block">
                {preview.totalPointsUsed} pts
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[11px] font-bold text-amber-800 uppercase block">Price Per 1 Point</span>
              <span className="text-lg font-black text-amber-900 mt-0.5 block">
                LKR {preview.pointPrice.toFixed(2)}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF8F0] border border-[#F5E6D3]">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Staff Count</span>
              <span className="text-lg font-black text-[#1A1A2E] mt-0.5 block">
                {preview.totalStaffCount} users
              </span>
            </div>
          </div>

          {/* User Breakdown Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-[#FFF8F0]/70 text-gray-600 font-extrabold uppercase">
                  <th className="py-2.5 px-3">Staff User</th>
                  <th className="py-2.5 px-3 text-center">Points Used</th>
                  <th className="py-2.5 px-3 text-right">Point Price</th>
                  <th className="py-2.5 px-3 text-right">Meal Cost (LKR)</th>
                  <th className="py-2.5 px-3 text-right">Prev Balance</th>
                  <th className="py-2.5 px-3 text-right">New Balance</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.userBreakdown?.map((u: any, idx: number) => {
                  const isDeficit = (u.newBalance ?? 0) <= 0;
                  return (
                    <tr key={u.userId || idx} className="hover:bg-[#FFF8F0]/40 transition">
                      <td className="py-3 px-3">
                        <strong className="text-[#1A1A2E] block">{u.name}</strong>
                        <span className="text-[11px] text-gray-400">{u.email}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-[#E67E22]">
                        {u.pointsUsed} pts
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600 font-semibold">
                        LKR {preview.pointPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-[#1A1A2E]">
                        LKR {u.deductionAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-600">
                        LKR {(u.previousBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-3 text-right font-extrabold ${isDeficit ? 'text-red-600' : 'text-[#27AE60]'}`}>
                        LKR {(u.newBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                            isDeficit
                              ? 'bg-red-100 text-red-600 border border-red-200'
                              : 'bg-[#27AE60]/10 text-[#27AE60]'
                          }`}
                        >
                          {isDeficit ? 'Deficit' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#F5E6D3] text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[#E67E22]/10 text-[#E67E22] flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
              </div>

              <h3 className="text-xl font-extrabold text-[#1A1A2E]">
                Finalize & Deduct Balances?
              </h3>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                This will deduct <strong>LKR {preview?.pointPrice?.toFixed(2)}</strong> per point from every staff member’s account for period <strong>{format(new Date(preview?.dateFrom), 'MMM d')} - {format(new Date(preview?.dateTo), 'MMM d, yyyy')}</strong>.
              </p>

              <div className="mt-4 p-3 rounded-2xl bg-[#FFF8F0] border border-[#F5E6D3] text-xs space-y-1 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-500">Chammery Budget:</span>
                  <strong className="text-[#1A1A2E]">{formatCurrency(preview?.totalBudget)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Points Used:</span>
                  <strong className="text-[#E67E22]">{preview?.totalPointsUsed} pts</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Users Settled:</span>
                  <strong className="text-[#1A1A2E]">{preview?.userBreakdown?.length} Staff Members</strong>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={finalizing}
                  onClick={handleFinalizeSettlement}
                  className="flex-1 py-3 bg-[#E67E22] hover:bg-[#D35400] text-white text-xs font-bold rounded-2xl shadow-md transition disabled:opacity-50"
                >
                  {finalizing ? 'Deducting Balances...' : 'Confirm & Apply'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Historical Finalized Settlements */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#F5E6D3] shadow-sm">
        <h3 className="font-extrabold text-sm sm:text-base text-[#1A1A2E] mb-4 flex items-center gap-2">
          <History size={18} className="text-[#E67E22]" />
          <span>Past Finalized Monthly Settlements</span>
        </h3>

        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading settlements...</div>
        ) : allocations.length === 0 ? (
          <div className="py-10 text-center text-gray-400 bg-[#FFF8F0]/40 rounded-2xl border border-dashed border-[#F5E6D3]">
            <PieChart size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="text-xs font-bold text-[#1A1A2E]">No finalized settlements yet</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Use the calculation form above to create your first month-end settlement.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allocations.map((alloc) => (
              <div
                key={alloc._id}
                className="p-4 rounded-2xl bg-[#FFF8F0]/60 border border-[#F5E6D3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-[#1A1A2E]">
                      {format(new Date(alloc.dateFrom), 'MMMM yyyy')} Settlement
                    </span>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-[#27AE60]/10 text-[#27AE60]">
                      {alloc.status || 'closed'}
                    </span>
                  </div>
                  <p className="text-gray-500 mt-0.5">
                    Period: {format(new Date(alloc.dateFrom), 'MMM d')} to {format(new Date(alloc.dateTo), 'MMM d, yyyy')}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px]">
                    <span className="font-semibold text-gray-500">
                      Budget: <strong className="text-[#1A1A2E]">{formatCurrency(alloc.totalBudget)}</strong>
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-gray-500">
                      Points: <strong className="text-[#E67E22]">{alloc.totalPointsUsed} pts</strong>
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-gray-500">
                      Price/Pt: <strong className="text-amber-700">LKR {Number(alloc.pointPrice || 0).toFixed(2)}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleDownloadPDF(alloc)}
                    className="py-2 px-3.5 bg-white hover:bg-[#F5E6D3] text-[#1A1A2E] border border-[#F5E6D3] text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    <Download size={13} />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

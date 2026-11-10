'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  TrendingUp,
  Calculator,
  Lock,
  Calendar,
  Sparkles,
  DollarSign,
  PieChart,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

export default function AdminAllocationPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0)).toISOString().split('T')[0];
  });
  const [totalBudget, setTotalBudget] = useState('100000');
  const [preview, setPreview] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const handleCalculatePreview = async () => {
    if (!dateFrom || !dateTo || !totalBudget) {
      toast.error('Please specify dates and total budget');
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
      toast.success('Preview calculated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Error calculating preview');
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveAndLock = async () => {
    if (!preview) {
      toast.error('Please calculate preview first');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/allocation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateFrom,
          dateTo,
          totalBudget: Number(totalBudget),
          isPreview: false,
          status: 'calculated',
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Allocation saved and locked!');
      setPreview(null);
      fetchAllocations();
    } catch (err: any) {
      toast.error(err.message || 'Error saving allocation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-28 pt-2 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
          Monthly Allocation & Point Pricing
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Compute actual per-point pricing based on total meal expenses divided by total points consumed
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Calculator Form */}
        <div className="lg:col-span-6">
          <div className="bg-white p-6 rounded-3xl border border-[#F5E6D3] shadow-sm space-y-4">
            <h3 className="font-extrabold text-sm text-[#1A1A2E] flex items-center gap-2">
              <Calculator size={18} className="text-[#E67E22]" />
              <span>Point Pricing Formula Engine</span>
            </h3>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0] border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-bold text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0] border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-bold text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
                />
              </div>
            </div>

            {/* Total Budget */}
            <div>
              <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                Total Monthly Budget Allocation (LKR)
              </label>
              <div className="relative flex items-center">
                <DollarSign size={18} className="absolute left-3 text-gray-400" />
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  placeholder="e.g. 500000"
                  className="w-full pl-10 pr-4 py-3 bg-[#FFF8F0]/70 border border-[#F5E6D3] rounded-2xl text-base font-extrabold text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Total invoice amount from catering provider for this period
              </p>
            </div>

            {/* Calculate Button */}
            <button
              type="button"
              onClick={handleCalculatePreview}
              disabled={calculating}
              className="w-full py-3.5 bg-[#E67E22] hover:bg-[#D35400] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Calculator size={16} />
              <span>{calculating ? 'Analyzing All User Orders...' : 'Calculate Preview'}</span>
            </button>
          </div>
        </div>

        {/* Preview Results Column */}
        <div className="lg:col-span-6">
          {preview ? (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-br from-[#1A1A2E] via-[#2A1E3C] to-[#1A1A2E] text-white p-6 rounded-3xl shadow-xl border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-[#FFDAB9] uppercase tracking-wider">
                  Calculation Preview
                </span>
                <span className="text-[11px] bg-[#27AE60]/20 text-[#27AE60] font-bold px-2.5 py-0.5 rounded-full">
                  Formula Ready
                </span>
              </div>

              {/* Point Price Result */}
              <div className="p-4 bg-white/10 rounded-2xl border border-white/10 mb-4 text-center">
                <span className="text-xs text-gray-300 block">Computed Point Price</span>
                <div className="text-3xl font-black text-white mt-1">
                  {formatCurrency(preview.pointPrice)}
                  <span className="text-xs font-normal text-gray-300"> / point</span>
                </div>
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-3 text-xs mb-5">
                <div className="bg-white/5 p-3 rounded-xl">
                  <span className="text-gray-400 block">Total Points Consumed</span>
                  <span className="text-base font-extrabold text-white mt-0.5 block">
                    {preview.totalPointsUsed} pts
                  </span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl">
                  <span className="text-gray-400 block">Total Budget</span>
                  <span className="text-base font-extrabold text-white mt-0.5 block">
                    {formatCurrency(preview.totalBudget)}
                  </span>
                </div>
              </div>

              {/* Meal Instances Breakdown */}
              <div className="p-3 bg-white/5 rounded-xl text-xs space-y-1 mb-5">
                <div className="flex justify-between text-gray-300">
                  <span>Breakfasts Served (1 pt each):</span>
                  <span className="font-bold text-white">{preview.breakdown.totalBreakfast}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Lunches Served (2 pts each):</span>
                  <span className="font-bold text-white">{preview.breakdown.totalLunch}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Dinners Served (1 pt each):</span>
                  <span className="font-bold text-white">{preview.breakdown.totalDinner}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveAndLock}
                disabled={saving}
                className="w-full py-3.5 bg-white text-[#1A1A2E] hover:bg-gray-100 text-xs sm:text-sm font-extrabold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Lock size={16} />
                <span>{saving ? 'Locking Period...' : 'Confirm & Lock Monthly Allocation'}</span>
              </button>
            </motion.div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-[#F5E6D3] text-center text-gray-500 h-full flex flex-col items-center justify-center">
              <PieChart size={40} className="text-gray-300 mb-2" />
              <h4 className="font-extrabold text-[#1A1A2E] text-sm">
                No Preview Generated Yet
              </h4>
              <p className="text-xs text-gray-400 max-w-xs mt-1">
                Enter your period date range & total catering invoice budget on the left to compute live point price.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Historical Allocations Table */}
      <div className="bg-white p-6 rounded-3xl border border-[#F5E6D3] shadow-sm">
        <h3 className="font-extrabold text-base text-[#1A1A2E] mb-4">
          Historical Locked Allocations
        </h3>

        {loading ? (
          <div className="text-center py-6 text-xs text-gray-500">Loading history...</div>
        ) : allocations.length === 0 ? (
          <p className="text-xs text-gray-400 py-6 text-center">No allocations recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {allocations.map((alloc) => (
              <div
                key={alloc._id}
                className="p-4 rounded-2xl bg-[#FFF8F0]/60 border border-[#F5E6D3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-[#1A1A2E]">
                      {format(new Date(alloc.dateFrom), 'MMM d, yyyy')} &rarr;{' '}
                      {format(new Date(alloc.dateTo), 'MMM d, yyyy')}
                    </span>
                    <span className="bg-[#27AE60]/10 text-[#27AE60] font-bold px-2 py-0.5 rounded-full uppercase text-[9px]">
                      {alloc.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-500 mt-1">
                    <span>Budget: <strong>{formatCurrency(alloc.totalBudget)}</strong></span>
                    <span>•</span>
                    <span>Points Used: <strong>{alloc.totalPointsUsed} pts</strong></span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-sm font-extrabold text-[#E67E22] bg-[#E67E22]/10 px-3 py-1.5 rounded-xl inline-block">
                    {formatCurrency(alloc.pointPrice)} / pt
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


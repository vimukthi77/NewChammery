'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, Sliders, ShieldCheck, CheckCircle2, AlertTriangle, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CutoffSettingsPage() {
  const [breakfastTime, setBreakfastTime] = useState('07:00');
  const [lunchTime, setLunchTime] = useState('10:00');
  const [dinnerTime, setDinnerTime] = useState('15:00');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    async function loadCutoffs() {
      try {
        setLoading(true);
        const res = await fetch('/api/settings/cutoff');
        const data = await res.json();
        if (data.success && data.settings) {
          setBreakfastTime(data.settings.breakfastCutoffTime || '07:00');
          setLunchTime(data.settings.lunchCutoffTime || '10:00');
          setDinnerTime(data.settings.dinnerCutoffTime || '15:00');
          setUpdatedAt(data.settings.updatedAt || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadCutoffs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch('/api/settings/cutoff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          breakfastCutoffTime: breakfastTime,
          lunchCutoffTime: lunchTime,
          dinnerCutoffTime: dinnerTime,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Cutoff times updated globally!');
      setUpdatedAt(new Date().toISOString());
    } catch (err: any) {
      toast.error(err.message || 'Error updating cutoffs');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-28 pt-2 px-4 max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
          Cutoff Time Management
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Configure daily ordering cutoffs. Past these times, users cannot order or cancel today’s meals.
        </p>
      </div>

      {/* Prominent Current Settings Banner */}
      <div className="bg-gradient-to-r from-[#1A1A2E] via-[#2B2347] to-[#1A1A2E] text-white p-5 rounded-3xl shadow-xl mb-6 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-[#FFDAB9] uppercase tracking-wider flex items-center gap-1.5">
            <Sliders size={14} className="text-[#E67E22]" /> Active Global Timings
          </span>
          {updatedAt && (
            <span className="text-[10px] text-gray-300">
              Last saved: {new Date(updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-2">
          <div className="bg-white/10 p-2.5 rounded-2xl">
            <span className="text-[10px] text-gray-300 block uppercase font-bold">Breakfast</span>
            <span className="text-lg font-black text-white mt-0.5 block">{breakfastTime}</span>
          </div>
          <div className="bg-white/10 p-2.5 rounded-2xl">
            <span className="text-[10px] text-gray-300 block uppercase font-bold">Lunch</span>
            <span className="text-lg font-black text-white mt-0.5 block">{lunchTime}</span>
          </div>
          <div className="bg-white/10 p-2.5 rounded-2xl">
            <span className="text-[10px] text-gray-300 block uppercase font-bold">Dinner</span>
            <span className="text-lg font-black text-white mt-0.5 block">{dinnerTime}</span>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border border-[#F5E6D3] shadow-sm space-y-5">
        {/* Breakfast Cutoff */}
        <div>
          <label className="block text-xs font-bold text-[#1A1A2E] uppercase tracking-wider mb-1.5">
            Breakfast Cutoff Time (HH:mm)
          </label>
          <div className="relative flex items-center">
            <Clock size={18} className="absolute left-3.5 text-[#8B4513]" />
            <input
              type="time"
              required
              value={breakfastTime}
              onChange={(e) => setBreakfastTime(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#FFF8F0]/70 border border-[#F5E6D3] rounded-2xl text-sm font-bold text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Default recommendation: 07:00 AM</p>
        </div>

        {/* Lunch Cutoff */}
        <div>
          <label className="block text-xs font-bold text-[#1A1A2E] uppercase tracking-wider mb-1.5">
            Lunch Cutoff Time (HH:mm)
          </label>
          <div className="relative flex items-center">
            <Clock size={18} className="absolute left-3.5 text-[#E67E22]" />
            <input
              type="time"
              required
              value={lunchTime}
              onChange={(e) => setLunchTime(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#FFF6ED]/70 border border-[#FFDAB9] rounded-2xl text-sm font-bold text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Default recommendation: 10:00 AM</p>
        </div>

        {/* Dinner Cutoff */}
        <div>
          <label className="block text-xs font-bold text-[#1A1A2E] uppercase tracking-wider mb-1.5">
            Dinner Cutoff Time (HH:mm)
          </label>
          <div className="relative flex items-center">
            <Clock size={18} className="absolute left-3.5 text-[#1A1A2E]" />
            <input
              type="time"
              required
              value={dinnerTime}
              onChange={(e) => setDinnerTime(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-[#FAF5F0]/70 border border-[#EFE2D3] rounded-2xl text-sm font-bold text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#E67E22]"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Default recommendation: 15:00 (03:00 PM)</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 bg-[#1A1A2E] hover:bg-black text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <Save size={16} />
          <span>{saving ? 'Applying Settings...' : 'Save Global Cutoff Settings'}</span>
        </button>
      </form>
    </div>
  );
}


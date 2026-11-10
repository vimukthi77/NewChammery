'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  UtensilsCrossed,
  Calendar,
  Filter,
  Check,
  X,
  PlusCircle,
  FileDown,
  UserCheck,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateString } from '@/lib/utils';

export default function AdminMealRequestsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMeal, setFilterMeal] = useState<'all' | 'breakfast' | 'lunch' | 'dinner'>('all');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [overrideBreakfast, setOverrideBreakfast] = useState(true);
  const [overrideLunch, setOverrideLunch] = useState(true);
  const [overrideDinner, setOverrideDinner] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/meals?all=true&date=${selectedDate}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
      }

      // Also get users list for override modal
      const uRes = await fetch('/api/users');
      const uData = await uRes.json();
      if (uData.success) {
        setUsers(uData.users || []);
        if (uData.users.length > 0 && !selectedUserId) {
          setSelectedUserId(uData.users[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedDate]);

  const handleAdminToggleMeal = async (item: any, mealKey: 'breakfast' | 'lunch' | 'dinner') => {
    try {
      const updatedValue = !item[mealKey];
      const res = await fetch('/api/meals/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          targetUserId: item.userId?._id || item.userId,
          breakfast: mealKey === 'breakfast' ? updatedValue : item.breakfast,
          lunch: mealKey === 'lunch' ? updatedValue : item.lunch,
          dinner: mealKey === 'dinner' ? updatedValue : item.dinner,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Meal request updated');
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Error updating request');
    }
  };

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    try {
      setSavingOverride(true);
      const res = await fetch('/api/meals/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          targetUserId: selectedUserId,
          breakfast: overrideBreakfast,
          lunch: overrideLunch,
          dinner: overrideDinner,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('Meal order created on behalf of user!');
      setShowOverrideModal(false);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Error creating request');
    } finally {
      setSavingOverride(false);
    }
  };

  // Filter requests
  const filtered = requests.filter((r) => {
    if (r.status === 'cancelled') return false;
    if (filterMeal === 'breakfast') return r.breakfast;
    if (filterMeal === 'lunch') return r.lunch;
    if (filterMeal === 'dinner') return r.dinner;
    return true;
  });

  const breakfastCount = requests.filter((r) => r.breakfast && r.status !== 'cancelled').length;
  const lunchCount = requests.filter((r) => r.lunch && r.status !== 'cancelled').length;
  const dinnerCount = requests.filter((r) => r.dinner && r.status !== 'cancelled').length;

  return (
    <div className="pb-28 pt-2 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
            Daily Meal Requests
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time orders for kitchen staff & admin meal modifications
          </p>
        </div>

        <button
          onClick={() => setShowOverrideModal(true)}
          className="py-2.5 px-4 bg-[#1A1A2E] hover:bg-black text-white text-xs font-bold rounded-2xl shadow-md flex items-center gap-1.5 transition"
        >
          <PlusCircle size={16} />
          <span>Add Order for User</span>
        </button>
      </div>

      {/* Date & Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-[#F5E6D3] shadow-sm mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-[#E67E22]" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-[#F5E6D3] rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold text-[#1A1A2E] focus:outline-none focus:ring-1 focus:ring-[#E67E22]"
          />
        </div>

        {/* Meal Filter Pills */}
        <div className="flex items-center gap-1.5 bg-[#FFF8F0] p-1 rounded-2xl border border-[#F5E6D3]">
          <button
            onClick={() => setFilterMeal('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
              filterMeal === 'all' ? 'bg-[#1A1A2E] text-white shadow-sm' : 'text-gray-600'
            }`}
          >
            All ({requests.length})
          </button>
          <button
            onClick={() => setFilterMeal('breakfast')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
              filterMeal === 'breakfast' ? 'bg-[#8B4513] text-white shadow-sm' : 'text-gray-600'
            }`}
          >
            Breakfast ({breakfastCount})
          </button>
          <button
            onClick={() => setFilterMeal('lunch')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
              filterMeal === 'lunch' ? 'bg-[#E67E22] text-white shadow-sm' : 'text-gray-600'
            }`}
          >
            Lunch ({lunchCount})
          </button>
          <button
            onClick={() => setFilterMeal('dinner')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
              filterMeal === 'dinner' ? 'bg-[#1A1A2E] text-white shadow-sm' : 'text-gray-600'
            }`}
          >
            Dinner ({dinnerCount})
          </button>
        </div>
      </div>

      {/* Requests Table / Cards */}
      {loading ? (
        <div className="text-center py-12 text-xs text-gray-500">Loading daily orders...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-[#F5E6D3] text-center text-gray-500">
          <UtensilsCrossed size={36} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-bold text-[#1A1A2E]">No requests for this date</p>
          <p className="text-xs text-gray-400 mt-1">Try selecting another date or place an order manually.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div
              key={req._id}
              className="bg-white p-4 rounded-3xl border border-[#F5E6D3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E67E22]/10 text-[#E67E22] flex items-center justify-center font-bold">
                  {req.userId?.name ? req.userId.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-[#1A1A2E]">
                    {req.userId?.name || 'Staff Member'}
                  </h4>
                  <p className="text-xs text-gray-500">{req.userId?.email || 'N/A'}</p>
                </div>
              </div>

              {/* Meal badges with toggleable click for admin */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleAdminToggleMeal(req, 'breakfast')}
                  title="Click to toggle Breakfast"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 ${
                    req.breakfast
                      ? 'bg-[#FFF8F0] border-[#F5E6D3] text-[#8B4513]'
                      : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'
                  }`}
                >
                  {req.breakfast ? <Check size={12} strokeWidth={3} /> : <X size={12} />}
                  <span>Breakfast (1 pt)</span>
                </button>

                <button
                  onClick={() => handleAdminToggleMeal(req, 'lunch')}
                  title="Click to toggle Lunch"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 ${
                    req.lunch
                      ? 'bg-[#FFF6ED] border-[#FFDAB9] text-[#E67E22]'
                      : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'
                  }`}
                >
                  {req.lunch ? <Check size={12} strokeWidth={3} /> : <X size={12} />}
                  <span>Lunch (2 pts)</span>
                </button>

                <button
                  onClick={() => handleAdminToggleMeal(req, 'dinner')}
                  title="Click to toggle Dinner"
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1 ${
                    req.dinner
                      ? 'bg-[#FAF5F0] border-[#EFE2D3] text-[#1A1A2E]'
                      : 'bg-gray-100 border-gray-200 text-gray-400 opacity-60'
                  }`}
                >
                  {req.dinner ? <Check size={12} strokeWidth={3} /> : <X size={12} />}
                  <span>Dinner (1 pt)</span>
                </button>

                <span className="text-xs font-black text-[#1A1A2E] bg-gray-100 px-2.5 py-1.5 rounded-xl">
                  {req.totalPoints} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Override Order Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#F5E6D3]"
          >
            <h3 className="text-xl font-extrabold text-[#1A1A2E]">
              Add / Modify Meal for User
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Select user and meals for {selectedDate}. Admin overrides cutoffs.
            </p>

            <form onSubmit={handleCreateOverride} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                  Select User
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full p-3 bg-[#FFF8F0] border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-semibold text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22]"
                >
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                  Requested Meals
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideBreakfast}
                    onChange={(e) => setOverrideBreakfast(e.target.checked)}
                    className="accent-[#E67E22] w-4 h-4 rounded"
                  />
                  <span className="text-xs font-bold text-[#1A1A2E]">Breakfast (1 Point)</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideLunch}
                    onChange={(e) => setOverrideLunch(e.target.checked)}
                    className="accent-[#E67E22] w-4 h-4 rounded"
                  />
                  <span className="text-xs font-bold text-[#1A1A2E]">Lunch (2 Points)</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideDinner}
                    onChange={(e) => setOverrideDinner(e.target.checked)}
                    className="accent-[#E67E22] w-4 h-4 rounded"
                  />
                  <span className="text-xs font-bold text-[#1A1A2E]">Dinner (1 Point)</span>
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-2xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOverride}
                  className="flex-1 py-3 bg-[#1A1A2E] hover:bg-black text-white text-xs font-bold rounded-2xl shadow-md transition"
                >
                  {savingOverride ? 'Saving...' : 'Save Order'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}


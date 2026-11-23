'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Trash2,
  CheckCircle,
  XCircle,
  Mail,
  Shield,
  RefreshCw,
  Coins,
  DollarSign,
  Edit3,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && (session?.user as any)?.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [session, status, router]);

  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Change Balance Modal State
  const [balanceModalUser, setBalanceModalUser] = useState<any>(null);
  const [newBalanceInput, setNewBalanceInput] = useState<string>('');
  const [balanceReason, setBalanceReason] = useState<string>('');
  const [updatingBalance, setUpdatingBalance] = useState<boolean>(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const handleToggleStatus = async (user: any) => {
    try {
      setActionLoading(user._id);
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Error updating user status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (user: any) => {
    if (!confirm(`Generate new random password for ${user.name} and email it to ${user.email}?`)) {
      return;
    }

    try {
      setActionLoading(user._id);
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPassword: true }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(`New password generated: ${data.newPassword} (${data.emailSent ? 'Emailed' : 'Email pending'})`, {
        duration: 8000,
      });
    } catch (err: any) {
      toast.error(err.message || 'Error resetting password');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Are you sure you want to permanently delete user ${user.name}? This cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(user._id);
      const res = await fetch(`/api/users/${user._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success('User deleted successfully');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Error deleting user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenBalanceModal = (user: any) => {
    setBalanceModalUser(user);
    setNewBalanceInput(String(user.balance ?? 15000));
    setBalanceReason(`Admin balance adjustment for ${user.name}`);
  };

  const handleSaveBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceModalUser) return;
    const parsedBal = Number(newBalanceInput);
    if (isNaN(parsedBal)) {
      toast.error('Please enter a valid monetary number.');
      return;
    }

    try {
      setUpdatingBalance(true);
      const res = await fetch(`/api/users/${balanceModalUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          balance: parsedBal,
          reason: balanceReason || 'Admin direct balance update',
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast.success(
        `Balance for ${balanceModalUser.name} changed to LKR ${parsedBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}!`
      );
      setBalanceModalUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Error updating user balance');
    } finally {
      setUpdatingBalance(false);
    }
  };

  const currentDiff = balanceModalUser
    ? Number(newBalanceInput || 0) - (balanceModalUser.balance ?? 0)
    : 0;

  return (
    <div className="pb-28 pt-2 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
            User Management
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Add members, allocate points, and manage staff meal access
          </p>
        </div>

        <Link
          href="/admin/users/add"
          className="py-2.5 px-4 bg-[#1A1A2E] hover:bg-black text-white text-xs font-bold rounded-2xl shadow-md flex items-center gap-2 transition"
        >
          <UserPlus size={16} />
          <span>Add New User</span>
        </Link>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff by name or email..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#E67E22] shadow-sm"
        />
      </div>

      {/* Users List */}
      {loading ? (
        <div className="text-center py-12 text-xs text-gray-500">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-[#F5E6D3] text-center text-gray-500">
          <Users size={36} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm font-bold text-[#1A1A2E]">No users found</p>
          <p className="text-xs text-gray-400 mt-1">Try modifying your search or click 'Add New User'.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <motion.div
              key={user._id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-4 sm:p-5 rounded-3xl border border-[#F5E6D3] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              {/* User details */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFDAB9] to-[#E67E22] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-[#1A1A2E]">{user.name}</h4>
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                        user.isActive ? 'bg-[#27AE60]/10 text-[#27AE60]' : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {user.role === 'admin' && (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-[#8B4513]/10 text-[#8B4513]">
                        Admin
                      </span>
                    )}
                    {user.role === 'cook' && (
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-[#E67E22]/15 text-[#E67E22]">
                        Cook 🍳
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Mail size={12} /> {user.email}
                  </p>

                  {/* Balance & Points Breakdown */}
                  {user.role === 'user' && (
                    <div className="flex items-center gap-2 mt-2 text-[11px] flex-wrap">
                      <span className="font-semibold text-gray-500 flex items-center gap-1">
                        Balance:{' '}
                        <button
                          type="button"
                          onClick={() => handleOpenBalanceModal(user)}
                          className="group/bal inline-flex items-center gap-1 hover:opacity-80 transition cursor-pointer"
                          title="Click to change monetary balance"
                        >
                          <strong
                            className={
                              (user.balance ?? 0) <= 0
                                ? 'text-red-600 font-extrabold bg-red-50 px-1.5 py-0.5 rounded border border-red-200'
                                : 'text-[#27AE60] font-extrabold'
                            }
                          >
                            LKR {(user.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                          <Edit3 size={11} className="text-gray-400 group-hover/bal:text-[#E67E22] transition" />
                        </button>
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-gray-500">
                        Points Used: <strong className="text-[#E67E22]">{user.usedPoints || 0} pts</strong>
                      </span>
                      {user.startDate && (
                        <>
                          <span>•</span>
                          <span className="text-gray-400">
                            Since: {new Date(user.startDate).toLocaleDateString()}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                {/* Change Balance button */}
                {user.role === 'user' && (
                  <button
                    onClick={() => handleOpenBalanceModal(user)}
                    className="p-2.5 rounded-xl bg-[#27AE60]/10 hover:bg-[#27AE60]/20 text-[#27AE60] text-xs font-bold flex items-center gap-1 border border-[#27AE60]/30 transition active:scale-95 shadow-xs"
                    title="Change user monetary balance"
                  >
                    <DollarSign size={15} />
                    <span>Change Balance</span>
                  </button>
                )}

                {/* Reset password button */}
                <button
                  onClick={() => handleResetPassword(user)}
                  disabled={actionLoading === user._id}
                  title="Reset password and email"
                  className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold flex items-center gap-1 border border-gray-200 transition"
                >
                  <KeyRound size={15} />
                  <span className="hidden sm:inline">Reset Password</span>
                </button>

                {/* Toggle status */}
                <button
                  onClick={() => handleToggleStatus(user)}
                  disabled={actionLoading === user._id}
                  className={`p-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                    user.isActive
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                      : 'bg-[#27AE60]/10 text-[#27AE60] hover:bg-[#27AE60]/20 border border-[#27AE60]/30'
                  }`}
                >
                  {user.isActive ? 'Deactivate' : 'Activate'}
                </button>

                {/* Delete button (only if not admin or not self) */}
                <button
                  onClick={() => handleDeleteUser(user)}
                  disabled={actionLoading === user._id}
                  title="Delete user"
                  className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition border border-red-200"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Change Balance Modal */}
      <AnimatePresence>
        {balanceModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-[#F5E6D3] shadow-2xl max-w-md w-full p-6 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#27AE60]/10 text-[#27AE60] flex items-center justify-center font-bold">
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#1A1A2E]">
                      Change Money Balance
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Directly edit staff monetary balance
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setBalanceModalUser(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Staff Member Card */}
              <div className="p-3.5 rounded-2xl bg-[#FFF8F0] border border-[#F5E6D3] mb-4 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#1A1A2E] block">
                    {balanceModalUser.name}
                  </span>
                  <span className="text-[11px] text-gray-500 block">
                    {balanceModalUser.email}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block uppercase font-bold">
                    Current Balance
                  </span>
                  <strong
                    className={`text-sm font-black ${
                      (balanceModalUser.balance ?? 0) <= 0 ? 'text-red-600' : 'text-[#27AE60]'
                    }`}
                  >
                    LKR {(balanceModalUser.balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
              </div>

              <form onSubmit={handleSaveBalance} className="space-y-4">
                {/* New Balance Input */}
                <div>
                  <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                    New Monetary Balance (LKR) *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-bold text-gray-400">
                      LKR
                    </span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newBalanceInput}
                      onChange={(e) => setNewBalanceInput(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full pl-12 pr-4 py-3 bg-[#FFF8F0]/50 border border-[#F5E6D3] rounded-2xl text-sm font-black text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#27AE60]"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                    Quick Presets
                  </span>
                  <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setNewBalanceInput('15000')}
                      className="py-1.5 px-2 rounded-xl bg-[#FFF8F0] border border-[#F5E6D3] font-bold text-[#1A1A2E] hover:bg-[#F5E6D3] transition"
                    >
                      15,000
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewBalanceInput('20000')}
                      className="py-1.5 px-2 rounded-xl bg-[#FFF8F0] border border-[#F5E6D3] font-bold text-[#1A1A2E] hover:bg-[#F5E6D3] transition"
                    >
                      20,000
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNewBalanceInput(
                          String((balanceModalUser.balance ?? 0) + 5000)
                        )
                      }
                      className="py-1.5 px-2 rounded-xl bg-[#27AE60]/10 border border-[#27AE60]/30 font-bold text-[#27AE60] hover:bg-[#27AE60]/20 transition"
                    >
                      +5,000
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setNewBalanceInput(
                          String((balanceModalUser.balance ?? 0) + 15000)
                        )
                      }
                      className="py-1.5 px-2 rounded-xl bg-[#27AE60]/10 border border-[#27AE60]/30 font-bold text-[#27AE60] hover:bg-[#27AE60]/20 transition"
                    >
                      +15,000
                    </button>
                  </div>
                </div>

                {/* Net Change Difference Indicator */}
                <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Net Adjustment:</span>
                  <strong
                    className={`font-black ${
                      currentDiff > 0
                        ? 'text-[#27AE60]'
                        : currentDiff < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {currentDiff > 0 ? '+' : ''}LKR {currentDiff.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </strong>
                </div>

                {/* Reason Note */}
                <div>
                  <label className="block text-xs font-bold text-[#1A1A2E] uppercase mb-1">
                    Reason / Audit Note
                  </label>
                  <input
                    type="text"
                    value={balanceReason}
                    onChange={(e) => setBalanceReason(e.target.value)}
                    placeholder="e.g. Manual top-up / correction"
                    className="w-full p-2.5 bg-[#FFF8F0]/50 border border-[#F5E6D3] rounded-2xl text-xs text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#27AE60]"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBalanceModalUser(null)}
                    disabled={updatingBalance}
                    className="flex-1 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingBalance}
                    className="flex-1 py-3 rounded-2xl bg-[#27AE60] hover:bg-[#219653] text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <DollarSign size={15} />
                    <span>{updatingBalance ? 'Saving...' : 'Save New Balance'}</span>
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


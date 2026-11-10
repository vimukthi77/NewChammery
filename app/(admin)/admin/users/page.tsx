'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
  Coins
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
                  </div>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Mail size={12} /> {user.email}
                  </p>

                  {/* Points breakdown pill */}
                  <div className="flex items-center gap-2 mt-2 text-[11px]">
                    <span className="font-semibold text-gray-500">
                      Allocated: <strong className="text-[#1A1A2E]">{user.allocatedPoints || 0}</strong>
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-gray-500">
                      Used: <strong className="text-[#E67E22]">{user.usedPoints || 0}</strong>
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-gray-500">
                      Balance: <strong className="text-[#27AE60]">{user.remainingPoints || 0} pts</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 self-end sm:self-center">
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
    </div>
  );
}


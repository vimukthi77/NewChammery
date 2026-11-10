'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  UserPlus,
  ArrowLeft,
  Mail,
  User,
  Shield,
  Coins,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AddUserPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [initialPoints, setInitialPoints] = useState('20');
  const [initialAmount, setInitialAmount] = useState('0');
  const [loading, setLoading] = useState(false);
  const [createdUserModal, setCreatedUserModal] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) {
      toast.error('Please fill in name and email');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          role,
          initialPoints: Number(initialPoints) || 0,
          initialAmount: Number(initialAmount) || 0,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create user');
      }

      setCreatedUserModal({
        name: data.user.name,
        email: data.user.email,
        password: data.generatedPassword,
        emailSent: data.emailSent,
      });

      toast.success('User created successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Error creating user');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdUserModal) return;
    const text = `Chammery Login Credentials:\nEmail: ${createdUserModal.email}\nPassword: ${createdUserModal.password}\nLogin URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied to clipboard!');
  };

  return (
    <div className="pb-28 pt-2 px-4 max-w-xl mx-auto">
      {/* Back button */}
      <div className="mb-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#1A1A2E] transition"
        >
          <ArrowLeft size={16} />
          <span>Back to Users</span>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
          Add New User
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          A secure 8-character password will be auto-generated and emailed immediately.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-[#F5E6D3] shadow-sm space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-[#1A1A2E] uppercase tracking-wider mb-1.5">
            Full Name *
          </label>
          <div className="relative flex items-center">
            <User size={18} className="absolute left-3.5 text-gray-400" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Kasun Perera"
              className="w-full pl-10 pr-4 py-3 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#E67E22] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-[#1A1A2E] uppercase tracking-wider mb-1.5">
            Work Email Address *
          </label>
          <div className="relative flex items-center">
            <Mail size={18} className="absolute left-3.5 text-gray-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kasun@company.com"
              className="w-full pl-10 pr-4 py-3 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#E67E22] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Role */}
        <div>
          <label className="block text-xs font-bold text-[#1A1A2E] uppercase tracking-wider mb-1.5">
            Role
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('user')}
              className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                role === 'user'
                  ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]'
                  : 'bg-white text-gray-700 border-[#F5E6D3]'
              }`}
            >
              <span>Staff Member</span>
            </button>
            <button
              type="button"
              onClick={() => setRole('admin')}
              className={`py-2.5 px-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                role === 'admin'
                  ? 'bg-[#E67E22] text-white border-[#E67E22]'
                  : 'bg-white text-gray-700 border-[#F5E6D3]'
              }`}
            >
              <Shield size={14} />
              <span>Admin Access</span>
            </button>
          </div>
        </div>

        {/* Initial Allocation */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-xs font-bold text-[#1A1A2E] uppercase tracking-wider mb-1.5">
              Initial Points
            </label>
            <div className="relative flex items-center">
              <Coins size={16} className="absolute left-3 text-gray-400" />
              <input
                type="number"
                min="0"
                value={initialPoints}
                onChange={(e) => setInitialPoints(e.target.value)}
                placeholder="20"
                className="w-full pl-9 pr-3 py-2.5 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A1A2E] uppercase tracking-wider mb-1.5">
              Amount (LKR)
            </label>
            <div className="relative flex items-center">
              <DollarSign size={16} className="absolute left-3 text-gray-400" />
              <input
                type="number"
                min="0"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-9 pr-3 py-2.5 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm text-[#1A1A2E] focus:ring-2 focus:ring-[#E67E22] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#1A1A2E] hover:bg-black text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Generating Account & Sending Email...' : 'Create Account & Send Welcome Email'}
          </button>
        </div>
      </form>

      {/* Credentials Modal after creation */}
      {createdUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#F5E6D3] text-center"
          >
            <div className="w-14 h-14 rounded-full bg-[#27AE60]/10 text-[#27AE60] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>

            <h3 className="text-xl font-extrabold text-[#1A1A2E]">
              User Account Created!
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {createdUserModal.emailSent
                ? 'Welcome email has been sent with credentials.'
                : 'Account created. You can share credentials below directly.'}
            </p>

            {/* Credentials Card */}
            <div className="mt-4 p-4 rounded-2xl bg-[#FFF8F0] border border-[#F5E6D3] text-left text-xs space-y-2">
              <div>
                <span className="text-gray-500 font-semibold">User:</span>{' '}
                <strong className="text-[#1A1A2E]">{createdUserModal.name}</strong>
              </div>
              <div>
                <span className="text-gray-500 font-semibold">Email:</span>{' '}
                <strong className="text-[#1A1A2E]">{createdUserModal.email}</strong>
              </div>
              <div>
                <span className="text-gray-500 font-semibold">Auto-Generated Password:</span>{' '}
                <span className="font-mono font-bold text-sm text-[#E67E22] bg-white px-2 py-0.5 rounded border border-[#FFDAB9]">
                  {createdUserModal.password}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={handleCopyCredentials}
                className="flex-1 py-3 bg-[#E67E22] hover:bg-[#D35400] text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Copy size={14} />
                <span>Copy Credentials</span>
              </button>

              <button
                onClick={() => router.push('/admin/users')}
                className="py-3 px-5 bg-[#1A1A2E] hover:bg-black text-white text-xs font-bold rounded-2xl shadow-md transition"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}


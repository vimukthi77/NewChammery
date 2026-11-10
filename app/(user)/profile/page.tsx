'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  User,
  Lock,
  Fingerprint,
  LogOut,
  Shield,
  Bell,
  Mail,
  Check,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import BiometricModal from '@/components/biometric/BiometricModal';

export default function UserProfilePage() {
  const { data: session, update } = useSession();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      setEmail(session.user.email || '');
    }
    const bio = localStorage.getItem('chammery_biometric_enabled');
    setBiometricEnabled(bio === 'true');
  }, [session]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSavingPassword(true);
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update password');
      }

      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
    } catch (err: any) {
      toast.error(err.message || 'Error updating password');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggleBiometric = () => {
    if (biometricEnabled) {
      localStorage.removeItem('chammery_biometric_enabled');
      setBiometricEnabled(false);
      toast.success('Biometric login disabled on this device.');
    } else {
      setShowBiometricModal(true);
    }
  };

  return (
    <div className="pb-28 pt-2 px-4 max-w-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
          Your Profile
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Manage your account security, credentials, and preferences
        </p>
      </div>

      {/* Profile Card Header */}
      <div className="bg-white p-5 rounded-3xl border border-[#F5E6D3] shadow-sm flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#E67E22] to-[#8B4513] text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
          {name ? name.charAt(0).toUpperCase() : <User size={28} />}
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-[#1A1A2E] leading-snug">
            {name || 'Chammery User'}
          </h2>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
            <Mail size={12} /> {email}
          </p>
          <span className="inline-block mt-1 text-[10px] font-extrabold uppercase tracking-wider bg-[#FFDAB9]/60 text-[#8B4513] px-2.5 py-0.5 rounded-full">
            {(session?.user as any)?.role === 'admin' ? 'System Administrator' : 'Staff Member'}
          </span>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-4">
        {/* Biometric Toggle Card */}
        <div className="bg-white p-5 rounded-3xl border border-[#F5E6D3] shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E67E22]/10 text-[#E67E22] flex items-center justify-center">
              <Fingerprint size={22} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1A1A2E]">
                Biometric Login
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Use Fingerprint or Face ID for fast login
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleBiometric}
            type="button"
            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
              biometricEnabled ? 'bg-[#E67E22]' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                biometricEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Change Password Dropdown */}
        <div className="bg-white rounded-3xl border border-[#F5E6D3] shadow-sm overflow-hidden">
          <button
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            type="button"
            className="w-full p-5 flex items-center justify-between text-left hover:bg-gray-50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#8B4513]/10 text-[#8B4513] flex items-center justify-center">
                <Lock size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1A1A2E]">
                  Change Password
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update your login password securely
                </p>
              </div>
            </div>
            <ChevronRight
              size={18}
              className={`text-gray-400 transition-transform ${
                isChangingPassword ? 'rotate-90' : ''
              }`}
            />
          </button>

          {isChangingPassword && (
            <form onSubmit={handleChangePassword} className="p-5 pt-0 space-y-3 border-t border-gray-100">
              <div className="pt-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-xl text-xs focus:ring-1 focus:ring-[#E67E22] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-xl text-xs focus:ring-1 focus:ring-[#E67E22] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-xl text-xs focus:ring-1 focus:ring-[#E67E22] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full py-2.5 bg-[#1A1A2E] text-white text-xs font-bold rounded-xl hover:bg-black transition"
              >
                {savingPassword ? 'Saving...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>

        {/* Notifications Toggle */}
        <div className="bg-white p-5 rounded-3xl border border-[#F5E6D3] shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Bell size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1A1A2E]">
                Meal Cutoff Reminders
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Get alerted before meal cutoffs close
              </p>
            </div>
          </div>

          <button
            onClick={() => setNotifications(!notifications)}
            type="button"
            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
              notifications ? 'bg-[#27AE60]' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                notifications ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          type="button"
          className="w-full py-3.5 px-4 bg-white hover:bg-red-50 text-red-600 font-bold text-xs rounded-3xl border border-red-200 shadow-sm flex items-center justify-center gap-2 transition"
        >
          <LogOut size={16} />
          <span>Log Out from Chammery</span>
        </button>
      </div>

      <BiometricModal
        isOpen={showBiometricModal}
        onClose={() => setShowBiometricModal(false)}
        onSuccess={() => setBiometricEnabled(true)}
      />
    </div>
  );
}


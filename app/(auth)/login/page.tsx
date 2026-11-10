'use client';

import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, Utensils, Fingerprint, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { startAuthentication } from '@simplewebauthn/browser';
import BiometricModal from '@/components/biometric/BiometricModal';
import { MEAL_ASSETS } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [showBiometricEnrollModal, setShowBiometricEnrollModal] = useState(false);

  useEffect(() => {
    // Check if biometric is enrolled on this device
    const enrolled = localStorage.getItem('chammery_biometric_enabled');
    if (enrolled === 'true') {
      setHasBiometric(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    try {
      setLoading(true);
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success('Welcome back!');

      // Fetch user role from session
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      const userRole = sessionData?.user?.role;

      if (userRole === 'admin') {
        router.push('/admin/dashboard');
        return;
      }

      if (userRole === 'cook') {
        router.push('/cook/dashboard');
        return;
      }

      // If regular user and biometric not yet enrolled, prompt user to enable it
      const enrolled = localStorage.getItem('chammery_biometric_enabled');
      if (!enrolled) {
        setShowBiometricEnrollModal(true);
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      setBiometricLoading(true);

      // 1. Get authentication options from server
      const optRes = await fetch('/api/biometric/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email || null,
          clientHostname: typeof window !== 'undefined' ? window.location.hostname : undefined,
          clientOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
        }),
      });
      const optData = await optRes.json();

      if (!optData.success || !optData.options) {
        throw new Error(optData.error || 'Failed to initialize biometric login');
      }

      // 2. Trigger browser WebAuthn fingerprint / face ID prompt
      const authResponse = await startAuthentication(optData.options);

      // 3. Verify on server
      const verifyRes = await fetch('/api/biometric/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: authResponse,
          challenge: optData.options.challenge,
          clientHostname: typeof window !== 'undefined' ? window.location.hostname : undefined,
          clientOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success || !verifyData.userId) {
        throw new Error(verifyData.error || 'Biometric authentication failed');
      }

      // 4. Log in NextAuth session with verified biometric userId
      const signInRes = await signIn('credentials', {
        isBiometric: 'true',
        biometricUserId: verifyData.userId,
        redirect: false,
      });

      if (signInRes?.error) {
        toast.error(signInRes.error);
        return;
      }

      toast.success('Biometric login successful!');
      if (verifyData.user?.role === 'admin') {
        router.push('/admin/dashboard');
      } else if (verifyData.user?.role === 'cook') {
        router.push('/cook/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Biometric login error:', err);
      if (err.name === 'NotAllowedError') {
        toast.error('Biometric prompt cancelled');
      } else {
        toast.error(err.message || 'Biometric login failed');
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-[#FFF8F0]">
      {/* Background with subtle warm food imagery */}
      <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
        <img
          src={MEAL_ASSETS.loginBg}
          alt="Food background"
          className="w-full h-full object-cover filter blur-[2px]"
        />
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#F5E6D3]"
      >
        {/* App Logo & Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E67E22] to-[#8B4513] text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#E67E22]/30">
            <Utensils size={28} className="stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
            Chammery
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Sign in to manage your daily meals
          </p>
        </div>

        {/* Biometric Login Button (if already enrolled on this device) */}
        {hasBiometric && (
          <div className="mb-6">
            <button
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
              type="button"
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#E67E22] to-[#8B4513] text-white font-bold text-sm shadow-md hover:opacity-95 transition flex items-center justify-center gap-2.5 active:scale-[0.99]"
            >
              <Fingerprint size={20} />
              <span>{biometricLoading ? 'Authenticating...' : 'Login with Biometric (Touch/Face ID)'}</span>
            </button>

            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-gray-200 w-full" />
              <span className="bg-white px-3 text-[11px] text-gray-400 uppercase font-semibold">
                Or with password
              </span>
            </div>
          </div>
        )}

        {/* Standard Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#1A1A2E] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail size={18} className="absolute left-3.5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full pl-10 pr-4 py-3 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#E67E22] focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1A1A2E] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-3.5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-11 py-3 bg-[#FFF8F0]/60 border border-[#F5E6D3] rounded-2xl text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#E67E22] focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center text-xs pt-1">
            <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded accent-[#E67E22] w-4 h-4"
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-[#1A1A2E] hover:bg-black text-white text-sm font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2 active:scale-[0.99] mt-2"
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-6 text-center text-xs text-gray-400">
          Need an account? Contact your office administrator for login credentials.
        </div>
      </motion.div>

      {/* Post-login Biometric Enrollment Modal */}
      <BiometricModal
        isOpen={showBiometricEnrollModal}
        onClose={() => {
          setShowBiometricEnrollModal(false);
          router.push('/dashboard');
        }}
        onSuccess={() => {
          router.push('/dashboard');
        }}
      />
    </div>
  );
}


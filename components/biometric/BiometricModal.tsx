'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, ShieldCheck, X } from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import toast from 'react-hot-toast';

interface BiometricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BiometricModal({ isOpen, onClose, onSuccess }: BiometricModalProps) {
  const [loading, setLoading] = useState(false);

  const handleRegisterBiometric = async () => {
    try {
      setLoading(true);

      // 1. Fetch registration options from server
      const optRes = await fetch('/api/biometric/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const optData = await optRes.json();

      if (!optData.success || !optData.options) {
        throw new Error(optData.error || 'Failed to initialize biometric enrollment');
      }

      // 2. Perform WebAuthn registration in browser / phone
      const regResponse = await startRegistration(optData.options);

      // 3. Verify on server
      const verifyRes = await fetch('/api/biometric/verify-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: regResponse,
          challenge: optData.options.challenge,
          deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        throw new Error(verifyData.error || 'Biometric verification failed');
      }

      toast.success('Biometric authentication enabled!');
      localStorage.setItem('chammery_biometric_enabled', 'true');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Biometric error:', err);
      if (err.name === 'NotAllowedError') {
        toast.error('Biometric prompt was cancelled');
      } else {
        toast.error(err.message || 'Biometric setup failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#FFF8F0] rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-[#F5E6D3] relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 w-8 h-8 flex items-center justify-center rounded-full bg-white/60"
            >
              <X size={18} />
            </button>

            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#E67E22] to-[#8B4513] text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#E67E22]/30">
              <Fingerprint size={32} />
            </div>

            <h3 className="text-xl font-extrabold text-[#1A1A2E]">
              Enable Biometric Login
            </h3>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              Log in instantly using your phone’s Fingerprint or Face ID without typing your password each time.
            </p>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#8B4513] bg-[#FFDAB9]/40 py-1.5 px-3 rounded-xl mx-auto w-fit">
              <ShieldCheck size={14} />
              <span>Fast & Secure via WebAuthn</span>
            </div>

            <div className="mt-6 space-y-2.5">
              <button
                disabled={loading}
                onClick={handleRegisterBiometric}
                className="w-full py-3.5 px-4 bg-[#1A1A2E] hover:bg-black text-white text-sm font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Setting up...</span>
                ) : (
                  <>
                    <Fingerprint size={18} />
                    <span>Enable Biometric Access</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition"
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


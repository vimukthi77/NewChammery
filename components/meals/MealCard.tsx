'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, AlertCircle, Sparkles } from 'lucide-react';

interface MealCardProps {
  type: 'breakfast' | 'lunch' | 'dinner';
  title: string;       // "Breakfast" | "Lunch" | "Dinner"
  timeRange: string;   // "07:00 AM - 09:00 AM" etc.
  points: number;      // 1 or 2
  image: string;
  cutoffTime: string;  // "07:00"
  isPastCutoff: boolean;
  isSelected: boolean;
  isRequested: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function MealCard({
  type,
  title,
  timeRange,
  points,
  image,
  cutoffTime,
  isPastCutoff,
  isSelected,
  isRequested,
  onToggle,
  disabled = false,
}: MealCardProps) {
  const isCardDisabled = disabled || isPastCutoff;

  const bgStyles = {
    breakfast: 'bg-gradient-to-br from-[#FFF8F0] to-[#F5E6D3]/60 border-[#F5E6D3]',
    lunch: 'bg-gradient-to-br from-[#FFF6ED] to-[#FFDAB9]/40 border-[#FFDAB9]/70',
    dinner: 'bg-gradient-to-br from-[#FAF5F0] to-[#EFE2D3]/60 border-[#EFE2D3]',
  }[type];

  return (
    <motion.div
      onClick={() => {
        if (!isCardDisabled) onToggle();
      }}
      whileTap={!isCardDisabled ? { scale: 0.98 } : {}}
      className={`relative rounded-3xl p-5 border shadow-sm transition-all overflow-hidden cursor-pointer select-none ${bgStyles} ${
        isCardDisabled ? 'opacity-60 grayscale-[35%] cursor-not-allowed' : ''
      } ${
        isSelected && !isCardDisabled
          ? 'ring-2 ring-[#E67E22] shadow-md bg-white'
          : 'hover:border-[#E67E22]/60'
      }`}
    >
      {/* Top Requested Badge */}
      {isRequested && (
        <div className="absolute top-0 right-0 bg-[#27AE60] text-white text-[10px] font-bold px-3 py-1 rounded-bl-2xl flex items-center gap-1 shadow-sm">
          <Check size={12} strokeWidth={3} />
          <span>Requested ✓</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        {/* Left Column: Radio Button + Meal Name + Points + Cutoff */}
        <div className="flex-1 z-10">
          {/* Radio Button & Meal Title */}
          <div className="flex items-center gap-3 mb-2">
            {/* Custom Radio Button */}
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                isCardDisabled
                  ? 'border-gray-300 bg-gray-100'
                  : isSelected
                  ? 'border-[#E67E22] bg-[#E67E22] shadow-sm'
                  : 'border-gray-400 bg-white hover:border-[#E67E22]'
              }`}
            >
              {isSelected && (
                <div className="w-2.5 h-2.5 rounded-full bg-white" />
              )}
            </div>

            <div>
              <h3 className="font-extrabold text-xl text-[#1A1A2E] leading-tight">
                {title}
              </h3>
              <p className="text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                <Clock size={12} /> {timeRange}
              </p>
            </div>
          </div>

          {/* Points & Cutoff Status Row */}
          <div className="mt-3.5 flex items-center gap-2 flex-wrap">
            {/* Points Badge */}
            <span className="inline-flex items-center gap-1 text-xs font-black text-[#E67E22] bg-[#E67E22]/15 px-3 py-1 rounded-xl">
              <Sparkles size={12} /> {points} {points === 1 ? 'Point' : 'Points'}
            </span>

            {/* Cutoff Status */}
            {isPastCutoff ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#E74C3C] bg-red-100 px-2.5 py-1 rounded-xl">
                <AlertCircle size={12} /> Cutoff passed
              </span>
            ) : (
              <span className="text-xs text-gray-500 font-medium">
                Order before <strong className="text-[#1A1A2E] font-bold">{cutoffTime}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Right Food Image - Round circular dish photo */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
          <div className="w-full h-full rounded-full overflow-hidden shadow-md border-2 border-white ring-2 ring-[#E67E22]/20">
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover transform hover:scale-105 transition duration-300"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

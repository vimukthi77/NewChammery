'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays, subDays } from 'date-fns';
import {
  ChefHat,
  Calendar as CalendarIcon,
  Download,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Utensils,
  Sun,
  Sunset,
  Moon,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Mail
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function CookDashboardPage() {
  // Current selected date (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeTab, setActiveTab] = useState<'all' | 'breakfast' | 'lunch' | 'dinner'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data state
  const [counts, setCounts] = useState({
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    totalPoints: 0,
  });
  const [lists, setLists] = useState<{
    breakfastList: any[];
    lunchList: any[];
    dinnerList: any[];
  }>({
    breakfastList: [],
    lunchList: [],
    dinnerList: [],
  });
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [cutoffs, setCutoffs] = useState<any>(null);

  // Fetch kitchen orders for selected date
  const fetchRoster = async (targetDate: string, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fetch(`/api/meals?date=${targetDate}&all=true`);
      const data = await res.json();

      if (data.success) {
        setCounts(data.counts || { breakfast: 0, lunch: 0, dinner: 0, totalPoints: 0 });
        setLists(data.lists || { breakfastList: [], lunchList: [], dinnerList: [] });
        setAllRequests(data.requests || []);
        if (data.cutoffs) setCutoffs(data.cutoffs);
      } else {
        toast.error(data.error || 'Failed to load meal roster');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Network error loading kitchen orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRoster(selectedDate);
  }, [selectedDate]);

  // Date Navigation handlers
  const handlePrevDay = () => {
    const curr = new Date(selectedDate);
    const prev = subDays(curr, 1);
    setSelectedDate(prev.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const curr = new Date(selectedDate);
    const next = addDays(curr, 1);
    setSelectedDate(next.toISOString().split('T')[0]);
  };

  const handleSelectQuickDate = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  // Determine date label
  const dateFormatted = useMemo(() => {
    try {
      const parts = selectedDate.split('-').map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return format(d, 'EEEE, MMMM d, yyyy');
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  const isTodaySelected = selectedDate === todayStr;
  const isTomorrowSelected = selectedDate === tomorrowStr;

  // Filtered lists based on search
  const filteredBreakfast = useMemo(() => {
    return lists.breakfastList.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const email = item.email?.toLowerCase() || '';
      const q = searchQuery.toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [lists.breakfastList, searchQuery]);

  const filteredLunch = useMemo(() => {
    return lists.lunchList.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const email = item.email?.toLowerCase() || '';
      const q = searchQuery.toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [lists.lunchList, searchQuery]);

  const filteredDinner = useMemo(() => {
    return lists.dinnerList.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const email = item.email?.toLowerCase() || '';
      const q = searchQuery.toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [lists.dinnerList, searchQuery]);

  const filteredAllRequests = useMemo(() => {
    return allRequests.filter((req) => {
      const name = req.userId?.name?.toLowerCase() || '';
      const email = req.userId?.email?.toLowerCase() || '';
      const q = searchQuery.toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [allRequests, searchQuery]);

  // Export Daily Kitchen Sheet PDF
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();

      // Title & Branding
      doc.setFillColor(26, 26, 46); // Dark navy #1A1A2E
      doc.rect(0, 0, 210, 36, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CHAMMERY KITCHEN ROSTER', 14, 18);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 218, 185); // Peach #FFDAB9
      doc.text(`Daily Meal Preparation Sheet — ${dateFormatted}`, 14, 27);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 155, 27);

      // Summary Box
      let yPos = 44;
      doc.setTextColor(26, 26, 46);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('KITCHEN HEADCOUNT SUMMARY', 14, yPos);

      const totalMeals = counts.breakfast + counts.lunch + counts.dinner;

      autoTable(doc, {
        startY: yPos + 4,
        head: [['Meal Session', 'Order Count', 'Cutoff Time', 'Session Status']],
        body: [
          ['Breakfast (1 Pt)', `${counts.breakfast} plates`, cutoffs?.breakfastCutoffTime || '07:00 AM', counts.breakfast > 0 ? 'Active' : 'No Orders'],
          ['Lunch (2 Pts)', `${counts.lunch} plates`, cutoffs?.lunchCutoffTime || '10:00 AM', counts.lunch > 0 ? 'Active' : 'No Orders'],
          ['Dinner (1 Pt)', `${counts.dinner} plates`, cutoffs?.dinnerCutoffTime || '03:00 PM', counts.dinner > 0 ? 'Active' : 'No Orders'],
          ['TOTAL HEADCOUNT', `${totalMeals} PLATES`, '-', `${allRequests.length} Staff Members`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [230, 126, 34], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 },
      });

      // Individual Master Roster Table
      const finalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 26, 46);
      doc.text('STAFF MEAL REQUISITION ROSTER', 14, finalY);

      const tableData = allRequests.map((req, idx) => {
        const mealsArr: string[] = [];
        if (req.breakfast) mealsArr.push('Breakfast');
        if (req.lunch) mealsArr.push('Lunch');
        if (req.dinner) mealsArr.push('Dinner');

        return [
          idx + 1,
          req.userId?.name || 'Unknown Staff',
          req.userId?.email || 'N/A',
          mealsArr.join(', ') || 'None',
          `${req.totalPoints || 0} pts`,
          req.status === 'confirmed' ? 'Confirmed' : req.status,
        ];
      });

      autoTable(doc, {
        startY: finalY + 4,
        head: [['#', 'Staff Member', 'Email', 'Meals Requested', 'Points', 'Status']],
        body: tableData.length > 0 ? tableData : [['-', 'No staff meal orders found for this date', '-', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [26, 26, 46], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3.5 },
      });

      // Footer sign-off
      const endY = (doc as any).lastAutoTable.finalY + 18;
      if (endY < 270) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('Prepared by Kitchen Staff: ______________________      Head Chef Sign: ______________________', 14, endY);
      }

      // Save PDF
      doc.save(`Chammery_Kitchen_Roster_${selectedDate}.pdf`);
      toast.success('Kitchen sheet PDF downloaded!');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF kitchen sheet');
    }
  };

  return (
    <div className="pb-28 pt-2 px-4 max-w-4xl mx-auto">
      {/* Top Welcome & Roster Header */}
      <div className="bg-gradient-to-br from-[#1A1A2E] to-[#2C2C4E] rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-white/10 mb-5 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#E67E22]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E67E22]/20 border border-[#E67E22]/40 text-[#FFDAB9] text-xs font-bold uppercase tracking-wider mb-2">
              <ChefHat size={14} className="text-[#E67E22]" />
              <span>Kitchen Chef & Prep Portal</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Daily Kitchen Preparation Roster
            </h1>
            <p className="text-gray-300 text-xs mt-1">
              Live meal counts & staff roster for meal batch cooking and delivery.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchRoster(selectedDate, true)}
              disabled={refreshing}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-white border border-white/15 transition flex items-center gap-1.5 backdrop-blur-md shadow-sm"
              title="Refresh Roster"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2.5 rounded-2xl bg-[#E67E22] hover:bg-[#D35400] active:scale-95 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-[#E67E22]/30"
              title="Download Kitchen Roster PDF"
            >
              <Download size={14} />
              <span>Download Sheet (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#F5E6D3] shadow-sm mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Quick Tabs: Today / Tomorrow */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectQuickDate(todayStr)}
              className={`py-2 px-3.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                isTodaySelected
                  ? 'bg-[#1A1A2E] text-white shadow-md'
                  : 'bg-[#FFF8F0] text-[#1A1A2E] hover:bg-[#F5E6D3]'
              }`}
            >
              <span>Today</span>
              {isTodaySelected && <span className="w-1.5 h-1.5 rounded-full bg-[#E67E22]" />}
            </button>

            <button
              onClick={() => handleSelectQuickDate(tomorrowStr)}
              className={`py-2 px-3.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
                isTomorrowSelected
                  ? 'bg-[#1A1A2E] text-white shadow-md'
                  : 'bg-[#FFF8F0] text-[#1A1A2E] hover:bg-[#F5E6D3]'
              }`}
            >
              <span>Tomorrow</span>
              {isTomorrowSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#E67E22]" />}
            </button>
          </div>

          {/* Stepper + Date Picker for ANY date (previous / custom) */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevDay}
              className="w-9 h-9 rounded-2xl bg-[#FFF8F0] border border-[#F5E6D3] hover:bg-[#F5E6D3] active:scale-95 text-[#1A1A2E] flex items-center justify-center transition"
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Native Date Input Picker */}
            <div className="relative flex items-center">
              <CalendarIcon size={14} className="absolute left-3 text-[#E67E22] pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-8 pr-3 py-2 bg-[#FFF8F0] border border-[#F5E6D3] rounded-2xl text-xs font-bold text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#E67E22] transition cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="w-9 h-9 rounded-2xl bg-[#FFF8F0] border border-[#F5E6D3] hover:bg-[#F5E6D3] active:scale-95 text-[#1A1A2E] flex items-center justify-center transition"
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Selected Date Notice */}
        <div className="mt-3 pt-3 border-t border-[#F5E6D3]/60 flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">Viewing preparation roster for:</span>
          <span className="font-extrabold text-[#1A1A2E] bg-[#FFF8F0] px-3 py-1 rounded-xl border border-[#F5E6D3]">
            📅 {dateFormatted}
          </span>
        </div>
      </div>

      {/* Meal Session Headcount Cards (3 Key Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
        {/* Breakfast Card */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setActiveTab('breakfast')}
          className={`cursor-pointer p-4 sm:p-5 rounded-3xl border transition shadow-sm ${
            activeTab === 'breakfast'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
              : 'bg-white border-[#F5E6D3] hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Sun size={20} className="stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold text-gray-500">
              Cutoff: {cutoffs?.breakfastCutoffTime || '07:00'}
            </span>
          </div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Breakfast</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-[#1A1A2E]">{counts.breakfast}</span>
            <span className="text-xs font-bold text-gray-500">plates</span>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-lg inline-block">
            {counts.breakfast > 0 ? `${counts.breakfast} orders received` : 'No orders yet'}
          </div>
        </motion.div>

        {/* Lunch Card */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setActiveTab('lunch')}
          className={`cursor-pointer p-4 sm:p-5 rounded-3xl border transition shadow-sm ${
            activeTab === 'lunch'
              ? 'bg-orange-50 border-[#E67E22] ring-2 ring-orange-300'
              : 'bg-white border-[#F5E6D3] hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E67E22]/15 text-[#E67E22] flex items-center justify-center">
              <Utensils size={20} className="stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold text-gray-500">
              Cutoff: {cutoffs?.lunchCutoffTime || '10:00'}
            </span>
          </div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Lunch</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-[#1A1A2E]">{counts.lunch}</span>
            <span className="text-xs font-bold text-gray-500">plates</span>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-[#E67E22] bg-orange-100/60 px-2 py-0.5 rounded-lg inline-block">
            {counts.lunch > 0 ? `${counts.lunch} orders received` : 'No orders yet'}
          </div>
        </motion.div>

        {/* Dinner Card */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setActiveTab('dinner')}
          className={`cursor-pointer p-4 sm:p-5 rounded-3xl border transition shadow-sm ${
            activeTab === 'dinner'
              ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-300'
              : 'bg-white border-[#F5E6D3] hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 flex items-center justify-center">
              <Moon size={20} className="stroke-[2.5]" />
            </div>
            <span className="text-[11px] font-bold text-gray-500">
              Cutoff: {cutoffs?.dinnerCutoffTime || '15:00'}
            </span>
          </div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Dinner</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-[#1A1A2E]">{counts.dinner}</span>
            <span className="text-xs font-bold text-gray-500">plates</span>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-indigo-700 bg-indigo-100/60 px-2 py-0.5 rounded-lg inline-block">
            {counts.dinner > 0 ? `${counts.dinner} orders received` : 'No orders yet'}
          </div>
        </motion.div>
      </div>

      {/* Roster Container */}
      <div className="bg-white rounded-3xl border border-[#F5E6D3] shadow-sm p-4 sm:p-6">
        {/* Navigation Tabs and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-3.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-[#1A1A2E] text-white shadow-sm'
                  : 'bg-[#FFF8F0] text-gray-600 hover:text-[#1A1A2E]'
              }`}
            >
              <span>All Staff Orders</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-md text-[10px]">
                {allRequests.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('breakfast')}
              className={`py-2 px-3.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'breakfast'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-[#FFF8F0] text-gray-600 hover:text-[#1A1A2E]'
              }`}
            >
              <span>Breakfast</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-md text-[10px]">
                {counts.breakfast}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('lunch')}
              className={`py-2 px-3.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'lunch'
                  ? 'bg-[#E67E22] text-white shadow-sm'
                  : 'bg-[#FFF8F0] text-gray-600 hover:text-[#1A1A2E]'
              }`}
            >
              <span>Lunch</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-md text-[10px]">
                {counts.lunch}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('dinner')}
              className={`py-2 px-3.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'dinner'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-[#FFF8F0] text-gray-600 hover:text-[#1A1A2E]'
              }`}
            >
              <span>Dinner</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-md text-[10px]">
                {counts.dinner}
              </span>
            </button>
          </div>

          {/* Search Field */}
          <div className="relative min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff name..."
              className="w-full pl-9 pr-3 py-2 bg-[#FFF8F0]/70 border border-[#F5E6D3] rounded-2xl text-xs text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#E67E22] transition"
            />
          </div>
        </div>

        {/* Content list */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-[#E67E22] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-gray-500">Loading meal requests for {dateFormatted}...</p>
          </div>
        ) : (
          <div>
            {/* 1. All Orders View */}
            {activeTab === 'all' && (
              filteredAllRequests.length === 0 ? (
                <div className="py-12 text-center text-gray-400 bg-[#FFF8F0]/40 rounded-2xl border border-dashed border-[#F5E6D3]">
                  <Utensils size={36} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-xs font-bold text-[#1A1A2E]">No meal orders for {dateFormatted}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Staff requests will appear here as they are placed.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredAllRequests.map((req, idx) => (
                    <motion.div
                      key={req._id || idx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 sm:p-4 rounded-2xl bg-[#FFF8F0]/60 border border-[#F5E6D3] flex items-center justify-between gap-3 hover:bg-[#FFF8F0] transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFDAB9] to-[#E67E22] text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                          {req.userId?.name ? req.userId.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-[#1A1A2E]">
                            {req.userId?.name || 'Staff Member'}
                          </h4>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Mail size={11} /> {req.userId?.email || 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Meals Requested Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {req.breakfast && (
                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 border border-amber-200">
                            Breakfast 🍳
                          </span>
                        )}
                        {req.lunch && (
                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-[#E67E22]/15 text-[#E67E22] border border-[#E67E22]/30">
                            Lunch 🍛
                          </span>
                        )}
                        {req.dinner && (
                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-700 border border-indigo-200">
                            Dinner 🍲
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )
            )}

            {/* 2. Breakfast Specific Tab */}
            {activeTab === 'breakfast' && (
              filteredBreakfast.length === 0 ? (
                <div className="py-12 text-center text-gray-400 bg-[#FFF8F0]/40 rounded-2xl border border-dashed border-[#F5E6D3]">
                  <Sun size={36} className="mx-auto mb-2 text-amber-300" />
                  <p className="text-xs font-bold text-[#1A1A2E]">No breakfast requests for this date</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 text-xs font-bold text-gray-500">
                    <span>Breakfast Headcount: {filteredBreakfast.length} plates</span>
                    <span>1 Point / Plate</span>
                  </div>
                  {filteredBreakfast.map((user, idx) => (
                    <div
                      key={user._id || idx}
                      className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-amber-700 w-5">{idx + 1}.</span>
                        <div>
                          <p className="text-xs font-bold text-[#1A1A2E]">{user.name}</p>
                          <p className="text-[11px] text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-md">
                        Breakfast 🍳
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* 3. Lunch Specific Tab */}
            {activeTab === 'lunch' && (
              filteredLunch.length === 0 ? (
                <div className="py-12 text-center text-gray-400 bg-[#FFF8F0]/40 rounded-2xl border border-dashed border-[#F5E6D3]">
                  <Utensils size={36} className="mx-auto mb-2 text-orange-300" />
                  <p className="text-xs font-bold text-[#1A1A2E]">No lunch requests for this date</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 text-xs font-bold text-gray-500">
                    <span>Lunch Headcount: {filteredLunch.length} plates</span>
                    <span>2 Points / Plate</span>
                  </div>
                  {filteredLunch.map((user, idx) => (
                    <div
                      key={user._id || idx}
                      className="p-3 rounded-2xl bg-orange-50/50 border border-orange-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-[#E67E22] w-5">{idx + 1}.</span>
                        <div>
                          <p className="text-xs font-bold text-[#1A1A2E]">{user.name}</p>
                          <p className="text-[11px] text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#E67E22] bg-orange-100 px-2.5 py-0.5 rounded-md">
                        Lunch 🍛
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* 4. Dinner Specific Tab */}
            {activeTab === 'dinner' && (
              filteredDinner.length === 0 ? (
                <div className="py-12 text-center text-gray-400 bg-[#FFF8F0]/40 rounded-2xl border border-dashed border-[#F5E6D3]">
                  <Moon size={36} className="mx-auto mb-2 text-indigo-300" />
                  <p className="text-xs font-bold text-[#1A1A2E]">No dinner requests for this date</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 text-xs font-bold text-gray-500">
                    <span>Dinner Headcount: {filteredDinner.length} plates</span>
                    <span>1 Point / Plate</span>
                  </div>
                  {filteredDinner.map((user, idx) => (
                    <div
                      key={user._id || idx}
                      className="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-bold text-indigo-700 w-5">{idx + 1}.</span>
                        <div>
                          <p className="text-xs font-bold text-[#1A1A2E]">{user.name}</p>
                          <p className="text-[11px] text-gray-500">{user.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2.5 py-0.5 rounded-md">
                        Dinner 🍲
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}


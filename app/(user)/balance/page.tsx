'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  WalletCards,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  FileText,
  AlertTriangle,
  History,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function UserBalancePage() {
  const [topups, setTopups] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monetaryBalance, setMonetaryBalance] = useState(15000);
  const [usedPoints, setUsedPoints] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [topupRes, mealsRes, allocRes] = await Promise.all([
          fetch('/api/topup'),
          fetch('/api/meals'),
          fetch('/api/allocation'),
        ]);

        const [topupData, mealsData, allocData] = await Promise.all([
          topupRes.json(),
          mealsRes.json(),
          allocRes.json(),
        ]);

        if (topupData.success) {
          setTopups(topupData.topups || []);
        }

        if (mealsData.success && mealsData.userStats) {
          setUsedPoints(mealsData.userStats.used || 0);
          if (typeof mealsData.userStats.monetaryBalance === 'number') {
            setMonetaryBalance(mealsData.userStats.monetaryBalance);
          }
        }

        if (allocData.success && allocData.statements) {
          setStatements(allocData.statements);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const isDeficit = monetaryBalance <= 0;

  // Individual Monthly Statement PDF Download
  const handleDownloadPersonalStatement = (stmt: any) => {
    try {
      const doc = new jsPDF();
      const my = stmt.myDetails || {};

      // Header Banner
      doc.setFillColor(26, 26, 46); // #1A1A2E
      doc.rect(0, 0, 210, 36, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CHAMMERY MEAL STATEMENT', 14, 18);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 218, 185); // #FFDAB9
      doc.text(`Monthly Employee Meal Expense Statement`, 14, 27);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(`Issued: ${new Date().toLocaleDateString()}`, 155, 27);

      // Period & Staff Member Info Box
      let yPos = 46;
      doc.setTextColor(26, 26, 46);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`STATEMENT PERIOD: ${format(new Date(stmt.dateFrom), 'MMMM d, yyyy')} — ${format(new Date(stmt.dateTo), 'MMMM d, yyyy')}`, 14, yPos);

      autoTable(doc, {
        startY: yPos + 4,
        head: [['Staff Name', 'Email', 'Chammery Monthly Budget', 'Calculated 1 Point Price']],
        body: [
          [
            my.name || 'Staff Member',
            my.email || 'N/A',
            `LKR ${Number(stmt.totalBudget || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            `LKR ${Number(stmt.pointPrice || 0).toFixed(2)} / pt`,
          ],
        ],
        theme: 'striped',
        headStyles: { fillColor: [230, 126, 34], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9.5, cellPadding: 3.5 },
      });

      // Individual Settlement Breakdown
      const finalY = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(26, 26, 46);
      doc.text('SETTLEMENT DETAILS & DEDUCTION', 14, finalY);

      autoTable(doc, {
        startY: finalY + 4,
        head: [['Item Description', 'Value']],
        body: [
          ['Total Meal Points Consumed in Period', `${my.pointsUsed || 0} Points`],
          ['Point Valuation (Chammery Budget / Total Points)', `LKR ${Number(stmt.pointPrice || 0).toFixed(2)} per point`],
          ['Total Meal Cost Deduction (Points × Point Price)', `LKR ${Number(my.deductionAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
          ['Account Balance Before Settlement', `LKR ${Number(my.previousBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
          ['Ending Balance After Settlement', `LKR ${Number(my.newBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
          ['Account Status', (my.newBalance ?? 0) <= 0 ? 'DEFICIT (Top-up required)' : 'ACTIVE / IN GOOD STANDING'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [26, 26, 46], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 },
      });

      // Footer
      const endY = (doc as any).lastAutoTable.finalY + 18;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text('This is a computer-generated monthly settlement statement from Chammery.', 14, endY);

      const fileDate = format(new Date(stmt.dateFrom), 'yyyy-MM');
      doc.save(`Chammery_Statement_${fileDate}.pdf`);
      toast.success('Monthly statement PDF downloaded!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to generate PDF statement');
    }
  };

  return (
    <div className="pb-28 pt-2 px-4 max-w-xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
          Balance & Monthly Statements
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          View your current monetary balance, points consumption, and past monthly settlement statements.
        </p>
      </div>

      {/* Main Balance Hero Card */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-3xl p-6 bg-gradient-to-br from-[#1A1A2E] via-[#2A1E3C] to-[#1A1A2E] text-white shadow-2xl relative overflow-hidden mb-5 border border-white/10"
      >
        <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-[#E67E22]/20 blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-[#FFDAB9] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={14} className="text-[#E67E22]" /> Available Balance
          </span>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
              isDeficit
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'bg-[#27AE60]/20 text-[#2ECC71] border border-[#27AE60]/30'
            }`}
          >
            {isDeficit ? 'Deficit / Blocked' : 'Active Account'}
          </span>
        </div>

        <div className="text-3xl sm:text-4xl font-black tracking-tight mb-1">
          <span className={isDeficit ? 'text-red-400' : 'text-white'}>
            LKR {monetaryBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <p className="text-xs text-gray-300 mt-1">
          {isDeficit
            ? 'Account in deficit. Meal requests suspended until admin top-up.'
            : 'Available balance for monthly mess expense settlement.'}
        </p>

        {/* Current Period Points Consumed */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
          <div>
            <span className="text-gray-400 block text-[11px]">Current Month Consumption</span>
            <span className="text-base font-extrabold text-[#FFDAB9]">
              {usedPoints} Points Used
            </span>
          </div>

          <div className="text-right">
            <span className="text-gray-400 block text-[11px]">Points Valuation</span>
            <span className="text-xs text-gray-300 font-semibold">
              Calculated at Month-End
            </span>
          </div>
        </div>
      </motion.div>

      {/* Deficit Alert Warning */}
      {isDeficit && (
        <div className="p-4 rounded-3xl bg-red-50 border border-red-200 shadow-sm mb-5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
            <Lock size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-red-800">
              Meal Ordering Suspended
            </h3>
            <p className="text-[11px] text-red-600 mt-0.5 leading-relaxed">
              You cannot place meal requests because your balance is currently negative (LKR {monetaryBalance.toFixed(2)}). Please contact your administrator to top up your account.
            </p>
          </div>
        </div>
      )}

      {/* Monthly Statements Section */}
      <div className="bg-white p-5 rounded-3xl border border-[#F5E6D3] shadow-sm mb-5">
        <h3 className="font-extrabold text-sm text-[#1A1A2E] mb-3 flex items-center gap-2">
          <FileText size={16} className="text-[#E67E22]" />
          <span>My Monthly Settlement Statements</span>
        </h3>

        {loading ? (
          <p className="text-xs text-gray-400 py-4 text-center">Loading statements...</p>
        ) : statements.length === 0 ? (
          <div className="py-6 text-center text-gray-400 bg-[#FFF8F0]/40 rounded-2xl border border-dashed border-[#F5E6D3]">
            <p className="text-xs font-bold text-[#1A1A2E]">No monthly statements yet</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Statements are automatically generated when Admin finalizes the month-end allocation.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {statements.map((stmt) => {
              const my = stmt.myDetails || {};
              return (
                <div
                  key={stmt._id}
                  className="p-3.5 rounded-2xl bg-[#FFF8F0]/60 border border-[#F5E6D3] text-xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#F5E6D3]/60 mb-2">
                    <strong className="text-sm font-bold text-[#1A1A2E]">
                      {format(new Date(stmt.dateFrom), 'MMMM yyyy')} Statement
                    </strong>
                    <button
                      onClick={() => handleDownloadPersonalStatement(stmt)}
                      className="py-1 px-2.5 bg-white hover:bg-[#F5E6D3] border border-[#F5E6D3] text-xs font-bold text-[#1A1A2E] rounded-xl transition flex items-center gap-1 shadow-xs"
                    >
                      <Download size={12} />
                      <span>PDF</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                    <div>
                      <span>Points Used:</span>{' '}
                      <strong className="text-[#E67E22]">{my.pointsUsed || 0} pts</strong>
                    </div>
                    <div>
                      <span>Point Price:</span>{' '}
                      <strong className="text-gray-800">LKR {Number(stmt.pointPrice || 0).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Meal Cost Deducted:</span>{' '}
                      <strong className="text-[#1A1A2E]">
                        LKR {Number(my.deductionAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div>
                      <span>Resulting Balance:</span>{' '}
                      <strong
                        className={
                          (my.newBalance ?? 0) <= 0 ? 'text-red-600' : 'text-[#27AE60]'
                        }
                      >
                        LKR {Number(my.newBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction & Top-up History */}
      <div className="bg-white p-5 rounded-3xl border border-[#F5E6D3] shadow-sm">
        <h3 className="font-extrabold text-sm text-[#1A1A2E] mb-3 flex items-center gap-2">
          <History size={16} className="text-[#E67E22]" />
          <span>Top-ups & Transaction History</span>
        </h3>

        {loading ? (
          <p className="text-xs text-gray-400 py-4 text-center">Loading transactions...</p>
        ) : topups.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No transactions recorded yet.</p>
        ) : (
          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {topups.map((t) => (
              <div
                key={t._id}
                className="p-3 rounded-2xl bg-[#FFF8F0]/60 border border-[#F5E6D3]/70 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-bold text-[#1A1A2E]">{t.description}</p>
                  <span className="text-[10px] text-gray-400">
                    {format(new Date(t.createdAt), 'MMM d, yyyy • h:mm a')}
                  </span>
                </div>

                <div className="text-right">
                  {t.amount !== 0 && (
                    <div
                      className={`font-black text-xs sm:text-sm ${
                        t.amount > 0 ? 'text-[#27AE60]' : 'text-red-600'
                      }`}
                    >
                      {t.amount > 0 ? `+${formatCurrency(t.amount)}` : formatCurrency(t.amount)}
                    </div>
                  )}
                  {t.points !== 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded inline-block ${
                        t.points > 0 ? 'text-[#E67E22]' : 'text-red-500'
                      }`}
                    >
                      {t.points > 0 ? `+${t.points}` : t.points} pts
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

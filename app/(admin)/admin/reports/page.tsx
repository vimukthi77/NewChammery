'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  BarChart3,
  FileDown,
  Download,
  Calendar,
  User,
  Users,
  Printer,
  Table,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AdminReportsPage() {
  const [reportType, setReportType] = useState<'individual' | 'summary' | 'daily'>('summary');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth() + 1, 0)).toISOString().split('T')[0];
  });
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.users) {
          setUsers(data.users);
          if (data.users.length > 0 && !selectedUserId) {
            setSelectedUserId(data.users[0]._id);
          }
        }
      });
  }, []);

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      let url = `/api/reports?type=${reportType}`;
      if (reportType === 'daily') {
        url += `&date=${dailyDate}`;
      } else {
        url += `&dateFrom=${dateFrom}&dateTo=${dateTo}`;
        if (reportType === 'individual') {
          url += `&userId=${selectedUserId}`;
        }
      }

      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setReportData(data);
      toast.success('Report data loaded!');
    } catch (err: any) {
      toast.error(err.message || 'Error generating report');
    } finally {
      setLoading(false);
    }
  };

  // PDF Export using jsPDF
  const handleExportPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const primaryColor: [number, number, number] = [230, 126, 34]; // #E67E22
    const darkColor: [number, number, number] = [26, 26, 46]; // #1A1A2E

    // Header Branding
    doc.setFillColor(...darkColor);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CHAMMERY MEAL MANAGEMENT', 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Corporate & Institutional Dining Operations', 14, 22);

    doc.setTextColor(200, 200, 200);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 22);

    let startY = 38;

    // Report Type 1: Individual User Report
    if (reportType === 'individual') {
      const u = reportData.user;
      const s = reportData.summary;

      doc.setTextColor(...darkColor);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`INDIVIDUAL STATEMENT: ${u.name.toUpperCase()}`, 14, startY);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Email: ${u.email}`, 14, startY + 6);
      doc.text(`Period: ${reportData.dateFrom} to ${reportData.dateTo}`, 14, startY + 12);
      doc.text(`Point Price Rate: LKR ${reportData.pointPrice.toFixed(2)}`, 14, startY + 18);

      const tableData = (reportData.mealRequests || []).map((m: any) => [
        format(new Date(m.date), 'yyyy-MM-dd'),
        m.breakfast ? 'YES (1 pt)' : 'NO',
        m.lunch ? 'YES (2 pts)' : 'NO',
        m.dinner ? 'YES (1 pt)' : 'NO',
        `${m.totalPoints} pts`,
        m.status.toUpperCase(),
      ]);

      autoTable(doc, {
        startY: startY + 24,
        head: [['Date', 'Breakfast', 'Lunch', 'Dinner', 'Daily Points', 'Status']],
        body: tableData,
        headStyles: { fillColor: primaryColor, textColor: 255 },
        theme: 'striped',
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('FINANCIAL SUMMARY', 14, finalY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Points Consumed: ${s.totalPointsUsed} pts`, 14, finalY + 6);
      doc.text(`Total Cost: LKR ${s.totalCost.toFixed(2)}`, 14, finalY + 12);
      doc.text(`Total Top-up Paid: LKR ${s.totalAmountPaid.toFixed(2)}`, 14, finalY + 18);

      if (s.dueAmount > 0) {
        doc.setTextColor(231, 76, 60);
        doc.setFont('helvetica', 'bold');
        doc.text(`AMOUNT DUE: LKR ${s.dueAmount.toFixed(2)}`, 14, finalY + 26);
      } else {
        doc.setTextColor(39, 174, 96);
        doc.setFont('helvetica', 'bold');
        doc.text(`CREDIT BALANCE: LKR ${s.creditAmount.toFixed(2)}`, 14, finalY + 26);
      }

      doc.save(`Chammery_Statement_${u.name.replace(/\s+/g, '_')}.pdf`);
      toast.success('Individual PDF Report downloaded!');
      return;
    }

    // Report Type 2: All Users Summary Report
    if (reportType === 'summary') {
      doc.setTextColor(...darkColor);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ALL USERS SUMMARY REPORT', 14, startY);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Period: ${reportData.dateFrom} to ${reportData.dateTo}`, 14, startY + 6);
      doc.text(`Point Price Rate: LKR ${reportData.pointPrice.toFixed(2)}`, 14, startY + 12);

      const tableData = (reportData.userSummaries || []).map((u: any) => [
        u.userName,
        u.userEmail,
        `${u.pointsUsed} pts`,
        `LKR ${u.totalCost.toFixed(2)}`,
        `LKR ${u.amountPaid.toFixed(2)}`,
        u.balanceOrDue < 0 ? `DUE LKR ${Math.abs(u.balanceOrDue).toFixed(2)}` : `LKR ${u.balanceOrDue.toFixed(2)}`,
      ]);

      // Add Grand Totals row
      const g = reportData.grandTotals;
      tableData.push([
        'GRAND TOTALS',
        '-',
        `${g.totalPointsUsed} pts`,
        `LKR ${g.totalCost.toFixed(2)}`,
        `LKR ${g.totalAmountPaid.toFixed(2)}`,
        `LKR ${(g.totalAmountPaid - g.totalCost).toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: startY + 18,
        head: [['User Name', 'Email', 'Total Points', 'Total Cost', 'Paid', 'Balance / Due']],
        body: tableData,
        headStyles: { fillColor: primaryColor, textColor: 255 },
        theme: 'striped',
      });

      doc.save(`Chammery_Summary_Report_${reportData.dateFrom}_to_${reportData.dateTo}.pdf`);
      toast.success('Summary PDF Report downloaded!');
      return;
    }

    // Report Type 3: Daily Kitchen Report
    if (reportType === 'daily') {
      doc.setTextColor(...darkColor);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`DAILY PRODUCTION REPORT: ${reportData.date}`, 14, startY);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Breakfasts: ${reportData.counts.breakfast}`, 14, startY + 6);
      doc.text(`Total Lunches: ${reportData.counts.lunch}`, 14, startY + 12);
      doc.text(`Total Dinners: ${reportData.counts.dinner}`, 14, startY + 18);
      doc.text(`Total Points: ${reportData.counts.totalPoints} pts`, 14, startY + 24);

      const tableData = (reportData.requests || []).map((r: any) => [
        r.userId?.name || 'Staff User',
        r.breakfast ? 'YES' : 'NO',
        r.lunch ? 'YES' : 'NO',
        r.dinner ? 'YES' : 'NO',
        `${r.totalPoints} pts`,
      ]);

      autoTable(doc, {
        startY: startY + 30,
        head: [['Staff Name', 'Breakfast', 'Lunch', 'Dinner', 'Points']],
        body: tableData,
        headStyles: { fillColor: primaryColor, textColor: 255 },
        theme: 'striped',
      });

      doc.save(`Chammery_Daily_Report_${reportData.date}.pdf`);
      toast.success('Daily PDF Report downloaded!');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!reportData) return;

    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportType === 'summary') {
      csvContent += 'Name,Email,Points Used,Total Cost,Paid,Balance Due\n';
      reportData.userSummaries.forEach((u: any) => {
        csvContent += `"${u.userName}","${u.userEmail}",${u.pointsUsed},${u.totalCost},${u.amountPaid},${u.balanceOrDue}\n`;
      });
    } else if (reportType === 'daily') {
      csvContent += 'Staff Name,Breakfast,Lunch,Dinner,Points\n';
      reportData.requests.forEach((r: any) => {
        csvContent += `"${r.userId?.name || 'User'}",${r.breakfast ? 'YES' : 'NO'},${r.lunch ? 'YES' : 'NO'},${r.dinner ? 'YES' : 'NO'},${r.totalPoints}\n`;
      });
    } else if (reportType === 'individual') {
      csvContent += 'Date,Breakfast,Lunch,Dinner,Points,Status\n';
      reportData.mealRequests.forEach((m: any) => {
        csvContent += `"${format(new Date(m.date), 'yyyy-MM-dd')}",${m.breakfast ? 'YES' : 'NO'},${m.lunch ? 'YES' : 'NO'},${m.dinner ? 'YES' : 'NO'},${m.totalPoints},${m.status}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Chammery_Export_${reportType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Export downloaded!');
  };

  return (
    <div className="pb-28 pt-2 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#1A1A2E] tracking-tight">
          Reports & PDF Generation
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Generate financial statements, all-user audits, and daily kitchen production sheets
        </p>
      </div>

      {/* Report Type Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 bg-[#F5E6D3]/60 p-1.5 rounded-2xl border border-[#F5E6D3] mb-6">
        <button
          onClick={() => {
            setReportType('summary');
            setReportData(null);
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            reportType === 'summary' ? 'bg-[#1A1A2E] text-white shadow-sm' : 'text-gray-700'
          }`}
        >
          <Users size={14} />
          <span>All Users Summary</span>
        </button>

        <button
          onClick={() => {
            setReportType('individual');
            setReportData(null);
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            reportType === 'individual' ? 'bg-[#1A1A2E] text-white shadow-sm' : 'text-gray-700'
          }`}
        >
          <User size={14} />
          <span>Individual Statement</span>
        </button>

        <button
          onClick={() => {
            setReportType('daily');
            setReportData(null);
          }}
          className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            reportType === 'daily' ? 'bg-[#1A1A2E] text-white shadow-sm' : 'text-gray-700'
          }`}
        >
          <Calendar size={14} />
          <span>Daily Kitchen Sheet</span>
        </button>
      </div>

      {/* Filter Parameters Form */}
      <div className="bg-white p-5 rounded-3xl border border-[#F5E6D3] shadow-sm mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          {reportType === 'daily' ? (
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Select Date
              </label>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="w-full p-2.5 bg-[#FFF8F0] border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-bold text-[#1A1A2E]"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0] border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-bold text-[#1A1A2E]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Date To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full p-2.5 bg-[#FFF8F0] border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-bold text-[#1A1A2E]"
                />
              </div>
            </>
          )}

          {reportType === 'individual' && (
            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Select User
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full p-2.5 bg-[#FFF8F0] border border-[#F5E6D3] rounded-2xl text-xs sm:text-sm font-semibold text-[#1A1A2E]"
              >
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="w-full py-3 bg-[#1A1A2E] hover:bg-black text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center justify-center gap-1.5"
            >
              <BarChart3 size={15} />
              <span>{loading ? 'Compiling...' : 'Generate Report'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Display & Export Toolbar */}
      {reportData && (
        <div className="space-y-4">
          {/* Download Bar */}
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#F5E6D3] shadow-sm flex-wrap gap-2">
            <div>
              <span className="font-extrabold text-sm text-[#1A1A2E]">
                Report Compiled Successfully
              </span>
              <p className="text-xs text-gray-500">
                Ready for printing, official audit PDF download, or Excel/CSV export
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="py-2 px-3 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <FileSpreadsheet size={15} />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleExportPDF}
                className="py-2 px-4 rounded-xl bg-[#E67E22] hover:bg-[#D35400] text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition active:scale-95"
              >
                <Download size={15} />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* Interactive Screen Preview */}
          <div className="bg-white p-6 rounded-3xl border border-[#F5E6D3] shadow-sm overflow-x-auto">
            {reportType === 'summary' && (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase font-bold text-[10px]">
                    <th className="py-2">User Name</th>
                    <th className="py-2">Email</th>
                    <th className="py-2 text-right">Points Used</th>
                    <th className="py-2 text-right">Total Cost</th>
                    <th className="py-2 text-right">Paid</th>
                    <th className="py-2 text-right">Balance / Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.userSummaries.map((u: any) => (
                    <tr key={u.userId} className="hover:bg-gray-50">
                      <td className="py-3 font-bold text-[#1A1A2E]">{u.userName}</td>
                      <td className="py-3 text-gray-500">{u.userEmail}</td>
                      <td className="py-3 text-right font-semibold">{u.pointsUsed} pts</td>
                      <td className="py-3 text-right font-semibold">{formatCurrency(u.totalCost)}</td>
                      <td className="py-3 text-right font-semibold text-[#27AE60]">{formatCurrency(u.amountPaid)}</td>
                      <td className={`py-3 text-right font-extrabold ${u.balanceOrDue < 0 ? 'text-red-600' : 'text-[#27AE60]'}`}>
                        {u.balanceOrDue < 0 ? `DUE ${formatCurrency(Math.abs(u.balanceOrDue))}` : formatCurrency(u.balanceOrDue)}
                      </td>
                    </tr>
                  ))}
                  {/* Grand Totals */}
                  <tr className="bg-[#FFF8F0] font-black text-xs text-[#1A1A2E]">
                    <td className="py-3" colSpan={2}>GRAND TOTALS</td>
                    <td className="py-3 text-right">{reportData.grandTotals.totalPointsUsed} pts</td>
                    <td className="py-3 text-right">{formatCurrency(reportData.grandTotals.totalCost)}</td>
                    <td className="py-3 text-right text-[#27AE60]">{formatCurrency(reportData.grandTotals.totalAmountPaid)}</td>
                    <td className="py-3 text-right">
                      {formatCurrency(reportData.grandTotals.totalAmountPaid - reportData.grandTotals.totalCost)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {reportType === 'individual' && (
              <div>
                <div className="mb-4 pb-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-[#1A1A2E]">{reportData.user.name}</h3>
                    <p className="text-xs text-gray-500">{reportData.user.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Total Cost in Period</span>
                    <span className="text-lg font-black text-[#E67E22]">{formatCurrency(reportData.summary.totalCost)}</span>
                  </div>
                </div>

                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 uppercase font-bold text-[10px]">
                      <th className="py-2">Date</th>
                      <th className="py-2">Breakfast</th>
                      <th className="py-2">Lunch</th>
                      <th className="py-2">Dinner</th>
                      <th className="py-2 text-right">Points</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(reportData.mealRequests || []).map((m: any) => (
                      <tr key={m._id} className="hover:bg-gray-50">
                        <td className="py-2.5 font-bold text-[#1A1A2E]">{format(new Date(m.date), 'EEE, MMM d')}</td>
                        <td className="py-2.5">{m.breakfast ? '✓ 1 pt' : '—'}</td>
                        <td className="py-2.5">{m.lunch ? '✓ 2 pts' : '—'}</td>
                        <td className="py-2.5">{m.dinner ? '✓ 1 pt' : '—'}</td>
                        <td className="py-2.5 text-right font-bold text-[#E67E22]">{m.totalPoints} pts</td>
                        <td className="py-2.5 text-right uppercase text-[10px] font-bold text-gray-500">{m.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {reportType === 'daily' && (
              <div>
                <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                  <div className="bg-[#FFF8F0] p-2.5 rounded-xl border border-[#F5E6D3]">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Breakfast</span>
                    <span className="text-lg font-black text-[#8B4513]">{reportData.counts.breakfast}</span>
                  </div>
                  <div className="bg-[#FFF6ED] p-2.5 rounded-xl border border-[#FFDAB9]">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Lunch</span>
                    <span className="text-lg font-black text-[#E67E22]">{reportData.counts.lunch}</span>
                  </div>
                  <div className="bg-[#FAF5F0] p-2.5 rounded-xl border border-[#EFE2D3]">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Dinner</span>
                    <span className="text-lg font-black text-[#1A1A2E]">{reportData.counts.dinner}</span>
                  </div>
                  <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Points</span>
                    <span className="text-lg font-black text-[#1A1A2E]">{reportData.counts.totalPoints}</span>
                  </div>
                </div>

                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 uppercase font-bold text-[10px]">
                      <th className="py-2">Staff Member</th>
                      <th className="py-2">Breakfast</th>
                      <th className="py-2">Lunch</th>
                      <th className="py-2">Dinner</th>
                      <th className="py-2 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(reportData.requests || []).map((r: any) => (
                      <tr key={r._id} className="hover:bg-gray-50">
                        <td className="py-2.5 font-bold text-[#1A1A2E]">{r.userId?.name || 'Staff User'}</td>
                        <td className="py-2.5">{r.breakfast ? '✓ YES' : '—'}</td>
                        <td className="py-2.5">{r.lunch ? '✓ YES' : '—'}</td>
                        <td className="py-2.5">{r.dinner ? '✓ YES' : '—'}</td>
                        <td className="py-2.5 text-right font-bold text-[#E67E22]">{r.totalPoints} pts</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


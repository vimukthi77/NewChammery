import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import MonthlyAllocation from '@/lib/models/MonthlyAllocation';
import MealRequest from '@/lib/models/MealRequest';
import Topup from '@/lib/models/Topup';
import { normalizeDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get('month') || new Date().toISOString().slice(0, 7);

    // 1. Fetch all active staff users
    const staffUsers = await User.find({ role: 'user', isActive: true }).select('name email balance startDate createdAt');

    // 2. Total user balance sum in Chammery
    const totalStaffBalance = staffUsers.reduce((sum, u) => sum + (typeof u.balance === 'number' ? u.balance : 0), 0);

    // 3. Find current month's allocation or latest allocation budget
    const [year, monthNum] = monthParam.split('-').map(Number);
    const startOfMonth = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59));

    let allocation = await MonthlyAllocation.findOne({
      $or: [
        { dateFrom: { $gte: startOfMonth, $lte: endOfMonth } },
        { dateTo: { $gte: startOfMonth, $lte: endOfMonth } },
      ],
    }).sort({ createdAt: -1 });

    // Fallback to latest monthly allocation if current month allocation is not created yet
    if (!allocation) {
      allocation = await MonthlyAllocation.findOne().sort({ createdAt: -1 });
    }

    const currentAllocationBudget = allocation?.totalBudget || 0;

    // 4. Calculate Net Available Chammery Balance / Treasury Reserve
    // Formula: Total User Balances Pool - Chammery Allocated Amount
    const availableBalance = totalStaffBalance - currentAllocationBudget;

    // 5. Query this month's meal points
    const mealQuery = {
      date: { $gte: startOfMonth, $lte: endOfMonth },
      status: { $ne: 'cancelled' },
    };

    const mealAgg = await MealRequest.aggregate([
      { $match: mealQuery },
      {
        $group: {
          _id: '$userId',
          totalPoints: { $sum: '$totalPoints' },
        },
      },
    ]);

    const userPointsMap: Record<string, number> = {};
    let totalPointsThisMonth = 0;
    mealAgg.forEach((m) => {
      const pts = m.totalPoints || 0;
      userPointsMap[m._id.toString()] = pts;
      totalPointsThisMonth += pts;
    });

    // Also include any manual points adjustments for this month
    const topupPointsAgg = await Topup.aggregate([
      {
        $match: {
          type: 'points_adjustment',
          month: monthParam,
        },
      },
      {
        $group: {
          _id: '$userId',
          pts: { $sum: '$points' },
        },
      },
    ]);

    topupPointsAgg.forEach((t) => {
      const uId = t._id.toString();
      const extra = t.pts || 0;
      userPointsMap[uId] = (userPointsMap[uId] || 0) + extra;
      totalPointsThisMonth += extra;
    });

    // 6. Estimated Point Price
    const estimatedPointPrice = totalPointsThisMonth > 0 && currentAllocationBudget > 0
      ? Number((currentAllocationBudget / totalPointsThisMonth).toFixed(2))
      : 0;

    // All-time points consumed up to today
    const now = new Date();
    const allMealToTodayAgg = await MealRequest.aggregate([
      { $match: { date: { $lte: now }, status: { $ne: 'cancelled' } } },
      { $group: { _id: null, pts: { $sum: '$totalPoints' } } },
    ]);
    const allMealPointsToToday = allMealToTodayAgg[0]?.pts || 0;

    const allAdjToTodayAgg = await Topup.aggregate([
      { $match: { type: 'points_adjustment', createdAt: { $lte: now } } },
      { $group: { _id: null, pts: { $sum: '$points' } } },
    ]);
    const allAdjustmentPointsToToday = allAdjToTodayAgg[0]?.pts || 0;
    const allPointsToToday = allMealPointsToToday + allAdjustmentPointsToToday;

    // 7. Lifetime Topups & Deductions totals
    const allTopups = await Topup.aggregate([
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    let totalDepositedTopups = 0;
    let totalSettledDeductions = 0;
    allTopups.forEach((t) => {
      if (t.totalAmount > 0) totalDepositedTopups += t.totalAmount;
      if (t.totalAmount < 0) totalSettledDeductions += Math.abs(t.totalAmount);
    });

    // 8. User Breakdown
    let deficitCount = 0;
    let totalDeficitAmount = 0;
    let healthyCount = 0;

    const userBreakdown = staffUsers.map((u) => {
      const bal = typeof u.balance === 'number' ? u.balance : 0;
      const pts = userPointsMap[u._id.toString()] || 0;
      const estCost = Number((pts * estimatedPointPrice).toFixed(2));
      const projected = Number((bal - estCost).toFixed(2));

      if (bal <= 0) {
        deficitCount++;
        totalDeficitAmount += Math.abs(bal);
      } else {
        healthyCount++;
      }

      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        balance: bal,
        pointsThisMonth: pts,
        estimatedCost: estCost,
        projectedBalance: projected,
        status: bal <= 0 ? 'deficit' : (bal < 3000 ? 'low' : 'healthy'),
      };
    });

    return NextResponse.json({
      success: true,
      month: monthParam,
      treasury: {
        totalStaffBalance, // Sum of all users' balance
        currentAllocationBudget, // This month Chammery allocation
        availableBalance, // totalStaffBalance - currentAllocationBudget
        totalPointsThisMonth,
        allPointsToToday,
        allMealPointsToToday,
        allAdjustmentPointsToToday,
        estimatedPointPrice,
        staffCount: staffUsers.length,
        deficitCount,
        totalDeficitAmount,
        healthyCount,
        totalDepositedTopups,
        totalSettledDeductions,
        hasAllocationRecord: Boolean(allocation),
        allocationStatus: allocation?.status || 'none',
      },
      users: userBreakdown,
    });
  } catch (error: any) {
    console.error('Treasury calculation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

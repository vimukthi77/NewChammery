import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import MonthlyAllocation from '@/lib/models/MonthlyAllocation';
import MealRequest from '@/lib/models/MealRequest';
import User from '@/lib/models/User';
import Topup from '@/lib/models/Topup';
import AuditLog from '@/lib/models/AuditLog';
import { normalizeDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = (session.user as any).role === 'admin';
    const userId = (session.user as any).id;

    await connectDB();

    if (isAdmin) {
      const allocations = await MonthlyAllocation.find()
        .populate('createdBy', 'name email')
        .populate('settledBy', 'name email')
        .sort({ createdAt: -1 });

      return NextResponse.json({ success: true, allocations });
    }

    // For regular user: return settlements where this user was included
    const allocations = await MonthlyAllocation.find({
      'userBreakdown.userId': userId,
      status: 'closed',
    }).sort({ settledAt: -1, createdAt: -1 });

    const userStatements = allocations.map((alloc) => {
      const myItem = alloc.userBreakdown?.find((item) => item.userId.toString() === userId);
      return {
        _id: alloc._id,
        dateFrom: alloc.dateFrom,
        dateTo: alloc.dateTo,
        totalBudget: alloc.totalBudget,
        totalPointsUsed: alloc.totalPointsUsed,
        pointPrice: alloc.pointPrice,
        settledAt: alloc.settledAt || alloc.createdAt,
        myDetails: myItem || null,
      };
    });

    return NextResponse.json({ success: true, statements: userStatements });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { dateFrom, dateTo, totalBudget, isPreview, finalize } = await req.json();

    if (!dateFrom || !dateTo || totalBudget === undefined || totalBudget === null) {
      return NextResponse.json({
        success: false,
        error: 'Date From, Date To, and Chammery Total Allocation Amount are required.',
      }, { status: 400 });
    }

    const parsedBudget = Number(totalBudget);
    if (parsedBudget < 0) {
      return NextResponse.json({ success: false, error: 'Total allocation budget must be positive.' }, { status: 400 });
    }

    await connectDB();

    const startDate = normalizeDate(new Date(dateFrom));
    const endDate = new Date(normalizeDate(new Date(dateTo)).getTime() + 86400000 - 1);
    const adminId = (session.user as any).id;

    // 1. Fetch all active staff users
    const staffUsers = await User.find({ role: 'user', isActive: true }).select('name email balance startDate');

    // 2. Calculate points used for each staff user in this date range
    const userBreakdown: any[] = [];
    let totalAllPoints = 0;

    for (const staff of staffUsers) {
      // Meal requests in date range
      const mealQuery: any = {
        userId: staff._id,
        date: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' },
      };

      const mealAgg = await MealRequest.aggregate([
        { $match: mealQuery },
        {
          $group: {
            _id: null,
            pts: { $sum: '$totalPoints' },
            breakfastCount: { $sum: '$breakfastPoints' },
            lunchCount: { $sum: { $divide: ['$lunchPoints', 2] } },
            dinnerCount: { $sum: '$dinnerPoints' },
          },
        },
      ]);

      const mealPoints = mealAgg[0]?.pts || 0;

      // Also check any manual points adjustments recorded in Topup within this period
      const startMonth = startDate.toISOString().slice(0, 7);
      const topupAdjustAgg = await Topup.aggregate([
        {
          $match: {
            userId: staff._id,
            type: 'points_adjustment',
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: null, pts: { $sum: '$points' } } },
      ]);

      const adjustedPoints = topupAdjustAgg[0]?.pts || 0;
      const totalUserPoints = Math.max(0, mealPoints + adjustedPoints);

      totalAllPoints += totalUserPoints;

      userBreakdown.push({
        userId: staff._id,
        name: staff.name,
        email: staff.email,
        pointsUsed: totalUserPoints,
        breakfastCount: mealAgg[0]?.breakfastCount || 0,
        lunchCount: mealAgg[0]?.lunchCount || 0,
        dinnerCount: mealAgg[0]?.dinnerCount || 0,
        previousBalance: typeof staff.balance === 'number' ? staff.balance : 15000,
        deductionAmount: 0,
        newBalance: typeof staff.balance === 'number' ? staff.balance : 15000,
      });
    }

    // 3. Compute 1 Point Price: Total Chammery Allocation / Total Points Used
    const pointPrice = totalAllPoints > 0 ? Number((parsedBudget / totalAllPoints).toFixed(2)) : 0;

    // 4. Update each user's deduction and projected new balance
    userBreakdown.forEach((u) => {
      const deduction = Number((u.pointsUsed * pointPrice).toFixed(2));
      u.deductionAmount = deduction;
      u.newBalance = Number((u.previousBalance - deduction).toFixed(2));
    });

    const summary = {
      dateFrom: startDate,
      dateTo: endDate,
      totalBudget: parsedBudget,
      totalPointsUsed: totalAllPoints,
      pointPrice,
      totalStaffCount: staffUsers.length,
      userBreakdown,
    };

    // If only requesting calculation preview
    if (isPreview) {
      return NextResponse.json({
        success: true,
        preview: summary,
      });
    }

    // 5. Finalize Settlement & Execute Balance Deductions
    if (finalize) {
      // Check if already settled for this exact range
      const existingSettled = await MonthlyAllocation.findOne({
        dateFrom: startDate,
        dateTo: endDate,
        status: 'closed',
      });

      if (existingSettled) {
        return NextResponse.json({
          success: false,
          error: 'A finalized settlement already exists for this exact date range. To avoid double deductions, please select a different period.',
        }, { status: 400 });
      }

      const periodLabel = `${dateFrom} to ${dateTo}`;
      const monthStr = dateFrom.slice(0, 7);

      // Perform deduction for every user with points
      for (const u of userBreakdown) {
        if (u.deductionAmount > 0) {
          // Decrement user's balance
          await User.findByIdAndUpdate(u.userId, {
            $set: { balance: u.newBalance },
          });

          // Record transaction in Topup
          await Topup.create({
            userId: u.userId,
            amount: -u.deductionAmount,
            points: -u.pointsUsed,
            type: 'settlement_deduction',
            month: monthStr,
            description: `Month-End Mess Settlement: ${u.pointsUsed} pts @ ${pointPrice} LKR/pt (${periodLabel})`,
            addedBy: adminId,
          });
        }
      }

      // Save Monthly Allocation record
      const allocation = await MonthlyAllocation.create({
        dateFrom: startDate,
        dateTo: endDate,
        totalBudget: parsedBudget,
        totalPointsUsed: totalAllPoints,
        pointPrice,
        status: 'closed',
        userBreakdown: userBreakdown.map((u) => ({
          userId: u.userId,
          name: u.name,
          email: u.email,
          pointsUsed: u.pointsUsed,
          deductionAmount: u.deductionAmount,
          previousBalance: u.previousBalance,
          newBalance: u.newBalance,
        })),
        settledAt: new Date(),
        settledBy: adminId,
        createdBy: adminId,
        calculatedAt: new Date(),
      });

      await AuditLog.create({
        userId: adminId,
        userName: session.user?.name || 'Admin',
        action: 'FINALIZE_MONTHLY_SETTLEMENT',
        details: `Finalized month settlement for ${periodLabel}. Budget: LKR ${parsedBudget}, Total Points: ${totalAllPoints}, Point Price: LKR ${pointPrice}. Deducted meal expenses for ${userBreakdown.length} users.`,
      });

      return NextResponse.json({
        success: true,
        message: 'Monthly settlement finalized! User balances have been deducted and the report is ready.',
        allocation,
      });
    }

    return NextResponse.json({
      success: true,
      calculation: summary,
    });
  } catch (error: any) {
    console.error('Allocation settlement error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

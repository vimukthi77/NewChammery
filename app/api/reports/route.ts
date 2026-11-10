import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import MealRequest from '@/lib/models/MealRequest';
import Topup from '@/lib/models/Topup';
import MonthlyAllocation from '@/lib/models/MonthlyAllocation';
import { normalizeDate } from '@/lib/utils';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const isAdmin = userRole === 'admin';
    const isCook = userRole === 'cook';

    if (!isAdmin && !isCook) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'summary'; // 'individual' | 'summary' | 'daily'

    // Cook role is restricted to daily reports only
    if (isCook && type !== 'daily') {
      return NextResponse.json({ success: false, error: 'Kitchen Cook can only access daily reports.' }, { status: 403 });
    }
    const date = searchParams.get('date');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const userId = searchParams.get('userId');

    await connectDB();

    // Find point price if there is an active/matching monthly allocation
    let pointPrice = 0;
    const latestAllocation = await MonthlyAllocation.findOne().sort({ createdAt: -1 });
    if (latestAllocation && latestAllocation.pointPrice) {
      pointPrice = latestAllocation.pointPrice;
    }

    // 1. DAILY REPORT
    if (type === 'daily') {
      const targetDate = normalizeDate(date ? new Date(date) : new Date());
      const requests = await MealRequest.find({
        date: targetDate,
        status: { $ne: 'cancelled' },
      }).populate('userId', 'name email profileImage');

      const breakfastUsers: any[] = [];
      const lunchUsers: any[] = [];
      const dinnerUsers: any[] = [];

      requests.forEach((r: any) => {
        if (r.breakfast) breakfastUsers.push(r.userId);
        if (r.lunch) lunchUsers.push(r.userId);
        if (r.dinner) dinnerUsers.push(r.userId);
      });

      return NextResponse.json({
        success: true,
        type: 'daily',
        date: targetDate.toISOString().split('T')[0],
        counts: {
          breakfast: breakfastUsers.length,
          lunch: lunchUsers.length,
          dinner: dinnerUsers.length,
          totalPoints: requests.reduce((s, r) => s + (r.totalPoints || 0), 0),
        },
        lists: {
          breakfastUsers,
          lunchUsers,
          dinnerUsers,
        },
        requests,
      });
    }

    // Date range preparation for individual or summary
    const startDate = dateFrom
      ? normalizeDate(new Date(dateFrom))
      : new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1));
    const endDate = dateTo
      ? new Date(normalizeDate(new Date(dateTo)).getTime() + 86400000 - 1)
      : new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59));

    // 2. INDIVIDUAL USER REPORT
    if (type === 'individual' && userId) {
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      const mealRequests = await MealRequest.find({
        userId,
        date: { $gte: startDate, $lte: endDate },
      }).sort({ date: 1 });

      const topups = await Topup.find({
        userId,
        createdAt: { $gte: startDate, $lte: endDate },
      });

      const totalPointsUsed = mealRequests
        .filter((r) => r.status !== 'cancelled')
        .reduce((sum, r) => sum + (r.totalPoints || 0), 0);
      const totalPointsAllocated = topups.reduce((sum, t) => sum + (t.points || 0), 0);
      const totalAmountPaid = topups.reduce((sum, t) => sum + (t.amount || 0), 0);

      const totalCost = Number((totalPointsUsed * pointPrice).toFixed(2));
      const balancePoints = totalPointsAllocated - totalPointsUsed;
      const dueAmount = totalCost > totalAmountPaid ? Number((totalCost - totalAmountPaid).toFixed(2)) : 0;
      const creditAmount = totalAmountPaid > totalCost ? Number((totalAmountPaid - totalCost).toFixed(2)) : 0;

      return NextResponse.json({
        success: true,
        type: 'individual',
        user,
        dateFrom: startDate.toISOString().split('T')[0],
        dateTo: endDate.toISOString().split('T')[0],
        pointPrice,
        summary: {
          totalPointsUsed,
          totalPointsAllocated,
          totalAmountPaid,
          totalCost,
          balancePoints,
          dueAmount,
          creditAmount,
        },
        mealRequests,
        topups,
      });
    }

    // 3. ALL USERS SUMMARY REPORT
    const users = await User.find({ role: 'user' }).select('name email');
    const userSummaries = await Promise.all(
      users.map(async (u) => {
        const meals = await MealRequest.aggregate([
          {
            $match: {
              userId: u._id,
              date: { $gte: startDate, $lte: endDate },
              status: { $ne: 'cancelled' },
            },
          },
          { $group: { _id: null, totalPoints: { $sum: '$totalPoints' } } },
        ]);

        const topups = await Topup.aggregate([
          {
            $match: {
              userId: u._id,
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          { $group: { _id: null, totalPoints: { $sum: '$points' }, totalAmount: { $sum: '$amount' } } },
        ]);

        const pointsUsed = meals[0]?.totalPoints || 0;
        const pointsAllocated = topups[0]?.totalPoints || 0;
        const amountPaid = topups[0]?.totalAmount || 0;
        const totalCost = Number((pointsUsed * pointPrice).toFixed(2));
        const balanceOrDue = Number((amountPaid - totalCost).toFixed(2));

        return {
          userId: u._id,
          userName: u.name,
          userEmail: u.email,
          pointsUsed,
          pointsAllocated,
          amountPaid,
          totalCost,
          balanceOrDue, // positive = surplus, negative = due
        };
      })
    );

    const grandTotals = userSummaries.reduce(
      (acc, curr) => ({
        totalPointsUsed: acc.totalPointsUsed + curr.pointsUsed,
        totalPointsAllocated: acc.totalPointsAllocated + curr.pointsAllocated,
        totalAmountPaid: acc.totalAmountPaid + curr.amountPaid,
        totalCost: acc.totalCost + curr.totalCost,
      }),
      { totalPointsUsed: 0, totalPointsAllocated: 0, totalAmountPaid: 0, totalCost: 0 }
    );

    return NextResponse.json({
      success: true,
      type: 'summary',
      dateFrom: startDate.toISOString().split('T')[0],
      dateTo: endDate.toISOString().split('T')[0],
      pointPrice,
      userSummaries,
      grandTotals,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import MonthlyAllocation from '@/lib/models/MonthlyAllocation';
import MealRequest from '@/lib/models/MealRequest';
import AuditLog from '@/lib/models/AuditLog';
import { normalizeDate } from '@/lib/utils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const allocations = await MonthlyAllocation.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, allocations });
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

    const { dateFrom, dateTo, totalBudget, isPreview, status = 'active' } = await req.json();

    if (!dateFrom || !dateTo || totalBudget === undefined || totalBudget === null) {
      return NextResponse.json({
        success: false,
        error: 'Date From, Date To, and Total Budget are required.',
      }, { status: 400 });
    }

    await connectDB();

    const startDate = normalizeDate(new Date(dateFrom));
    const endDate = new Date(normalizeDate(new Date(dateTo)).getTime() + 86400000 - 1);
    const parsedBudget = Number(totalBudget);

    // Sum points used by all users between dateFrom and dateTo
    const meals = await MealRequest.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
          status: { $ne: 'cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$totalPoints' },
          totalBreakfast: { $sum: '$breakfastPoints' },
          totalLunch: { $sum: { $divide: ['$lunchPoints', 2] } }, // 2 points per lunch, count meal instances
          totalDinner: { $sum: '$dinnerPoints' },
          requestCount: { $sum: 1 },
        },
      },
    ]);

    const totalPointsUsed = meals[0]?.totalPoints || 0;
    const pointPrice = totalPointsUsed > 0 ? parsedBudget / totalPointsUsed : 0;

    const calculation = {
      dateFrom: startDate,
      dateTo: endDate,
      totalBudget: parsedBudget,
      totalPointsUsed,
      pointPrice: Number(pointPrice.toFixed(2)),
      breakdown: {
        totalBreakfast: meals[0]?.totalBreakfast || 0,
        totalLunch: meals[0]?.totalLunch || 0,
        totalDinner: meals[0]?.totalDinner || 0,
        requestCount: meals[0]?.requestCount || 0,
      },
    };

    if (isPreview) {
      return NextResponse.json({
        success: true,
        preview: calculation,
      });
    }

    // Save allocation
    const allocation = await MonthlyAllocation.create({
      dateFrom: startDate,
      dateTo: endDate,
      totalBudget: parsedBudget,
      totalPointsUsed,
      pointPrice: Number(pointPrice.toFixed(2)),
      status: status || 'calculated',
      createdBy: (session.user as any).id,
      calculatedAt: new Date(),
    });

    await AuditLog.create({
      userId: (session.user as any).id,
      userName: session.user?.name || 'Admin',
      action: 'SET_MONTHLY_ALLOCATION',
      details: `Created allocation for ${dateFrom} to ${dateTo}: Budget=${parsedBudget}, Points=${totalPointsUsed}, Point Price=${pointPrice.toFixed(2)} LKR`,
    });

    return NextResponse.json({
      success: true,
      message: 'Monthly allocation created successfully.',
      allocation,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


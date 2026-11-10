import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import MealRequest from '@/lib/models/MealRequest';
import CutoffSettings from '@/lib/models/CutoffSettings';
import Topup from '@/lib/models/Topup';
import { normalizeDate } from '@/lib/utils';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');
    const monthParam = searchParams.get('month');
    const dateFromParam = searchParams.get('dateFrom');
    const dateToParam = searchParams.get('dateTo');
    const allUsers = searchParams.get('all') === 'true';
    const targetUserId = searchParams.get('userId');

    const isAdmin = (session.user as any).role === 'admin';
    const isCook = (session.user as any).role === 'cook';
    const effectiveUserId = (isAdmin && targetUserId) ? targetUserId : (session.user as any).id;

    await connectDB();

    // Get cutoff settings
    let cutoffs = await CutoffSettings.findOne();
    if (!cutoffs) {
      cutoffs = await CutoffSettings.create({
        breakfastCutoffTime: '07:00',
        lunchCutoffTime: '10:00',
        dinnerCutoffTime: '15:00',
      });
    }

    // Single Date query
    if (dateParam) {
      const queryDate = normalizeDate(new Date(dateParam));

      if ((isAdmin || isCook) && (allUsers || isCook)) {
        const requests = await MealRequest.find({ date: queryDate, status: { $ne: 'cancelled' } })
          .populate('userId', 'name email profileImage')
          .sort({ createdAt: -1 });

        // Calculate lists and counts
        const breakfastList: any[] = [];
        const lunchList: any[] = [];
        const dinnerList: any[] = [];

        requests.forEach((r: any) => {
          if (!r.userId) return;
          const userItem = {
            _id: r.userId._id,
            name: r.userId.name,
            email: r.userId.email,
            profileImage: r.userId.profileImage,
            status: r.status,
            requestedAt: r.requestedAt || r.createdAt,
            totalPoints: r.totalPoints,
          };
          if (r.breakfast) breakfastList.push(userItem);
          if (r.lunch) lunchList.push(userItem);
          if (r.dinner) dinnerList.push(userItem);
        });

        return NextResponse.json({
          success: true,
          date: dateParam,
          counts: {
            breakfast: breakfastList.length,
            lunch: lunchList.length,
            dinner: dinnerList.length,
            totalPoints: requests.reduce((s, r) => s + (r.totalPoints || 0), 0),
          },
          lists: {
            breakfastList,
            lunchList,
            dinnerList,
          },
          requests,
          cutoffs,
        });
      }

      // Single user request for that date
      const userRequest = await MealRequest.findOne({
        userId: effectiveUserId,
        date: queryDate,
      });

      return NextResponse.json({
        success: true,
        date: dateParam,
        request: userRequest,
        cutoffs,
      });
    }

    // Date range query
    const query: any = {};
    if (!isAdmin || !allUsers) {
      query.userId = effectiveUserId;
    }

    if (monthParam) {
      // e.g. "2025-03"
      const [year, month] = monthParam.split('-').map(Number);
      const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59));
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    } else if (dateFromParam && dateToParam) {
      const startDate = normalizeDate(new Date(dateFromParam));
      const endDate = new Date(normalizeDate(new Date(dateToParam)).getTime() + 86400000 - 1);
      query.date = { $gte: startDate, $lte: endDate };
    }

    let mealQuery = MealRequest.find(query).sort({ date: -1 });
    if (isAdmin && allUsers) {
      mealQuery = mealQuery.populate('userId', 'name email');
    }

    const requests = await mealQuery.exec();

    // Calculate user balance if specific user
    let userStats = null;
    if (!allUsers || !isAdmin) {
      const topups = await Topup.aggregate([
        { $match: { userId: effectiveUserId } },
        { $group: { _id: null, totalPoints: { $sum: '$points' } } },
      ]);
      const allocated = topups[0]?.totalPoints || 0;
      const totalUsed = requests
        .filter((r) => r.status !== 'cancelled')
        .reduce((sum, r) => sum + (r.totalPoints || 0), 0);
      userStats = {
        allocated,
        used: totalUsed,
        balance: allocated - totalUsed,
      };
    }

    return NextResponse.json({
      success: true,
      requests,
      cutoffs,
      userStats,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


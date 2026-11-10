import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import MealRequest from '@/lib/models/MealRequest';
import CutoffSettings from '@/lib/models/CutoffSettings';
import AuditLog from '@/lib/models/AuditLog';
import Holiday from '@/lib/models/Holiday';
import { normalizeDate, isPastCutoff } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { date, breakfast, lunch, dinner, targetUserId } = body;

    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
    }

    const isAdmin = (session.user as any).role === 'admin';
    const isCook = (session.user as any).role === 'cook';

    // Kitchen cook cannot request personal meals
    if (isCook) {
      return NextResponse.json({
        success: false,
        error: 'Kitchen Cook accounts cannot place personal meal requests.',
      }, { status: 403 });
    }

    // Admin cannot request meals for their own admin account
    if (isAdmin && !targetUserId) {
      return NextResponse.json({
        success: false,
        error: 'Admin accounts cannot place personal meal requests. Admin accounts manage the system, staff, and allocations only.',
      }, { status: 403 });
    }

    const effectiveUserId = (isAdmin && targetUserId) ? targetUserId : (session.user as any).id;

    await connectDB();

    const queryDate = normalizeDate(new Date(date));

    // Check if the day is marked as a holiday
    const holiday = await Holiday.findOne({ date: queryDate });
    if (holiday && !isAdmin) {
      return NextResponse.json({
        success: false,
        error: `Dining operations are closed on this date: ${holiday.title}`,
      }, { status: 400 });
    }

    // Fetch cutoffs
    let cutoffs = await CutoffSettings.findOne();
    if (!cutoffs) {
      cutoffs = await CutoffSettings.create({
        breakfastCutoffTime: '07:00',
        lunchCutoffTime: '10:00',
        dinnerCutoffTime: '15:00',
      });
    }

    const now = new Date();
    const todayMidnight = normalizeDate(now).getTime();
    const requestDateMidnight = queryDate.getTime();

    // Check if target date is in the past
    if (!isAdmin && requestDateMidnight < todayMidnight) {
      return NextResponse.json({
        success: false,
        error: 'Cannot place or modify meal requests for past dates.',
      }, { status: 400 });
    }

    // Cutoff validation for today's requests
    if (!isAdmin && requestDateMidnight === todayMidnight) {
      if (breakfast && isPastCutoff(cutoffs.breakfastCutoffTime, date)) {
        return NextResponse.json({
          success: false,
          error: `Breakfast cutoff time (${cutoffs.breakfastCutoffTime}) has passed for today.`,
        }, { status: 400 });
      }
      if (lunch && isPastCutoff(cutoffs.lunchCutoffTime, date)) {
        return NextResponse.json({
          success: false,
          error: `Lunch cutoff time (${cutoffs.lunchCutoffTime}) has passed for today.`,
        }, { status: 400 });
      }
      if (dinner && isPastCutoff(cutoffs.dinnerCutoffTime, date)) {
        return NextResponse.json({
          success: false,
          error: `Dinner cutoff time (${cutoffs.dinnerCutoffTime}) has passed for today.`,
        }, { status: 400 });
      }
    }

    // Existing request
    let mealReq = await MealRequest.findOne({
      userId: effectiveUserId,
      date: queryDate,
    });

    const isBreakfast = Boolean(breakfast);
    const isLunch = Boolean(lunch);
    const isDinner = Boolean(dinner);

    const breakfastPoints = isBreakfast ? 1 : 0;
    const lunchPoints = isLunch ? 2 : 0;
    const dinnerPoints = isDinner ? 1 : 0;
    const totalPoints = breakfastPoints + lunchPoints + dinnerPoints;

    if (!mealReq) {
      mealReq = new MealRequest({
        userId: effectiveUserId,
        date: queryDate,
        breakfast: isBreakfast,
        lunch: isLunch,
        dinner: isDinner,
        breakfastPoints,
        lunchPoints,
        dinnerPoints,
        totalPoints,
        status: totalPoints > 0 ? 'confirmed' : 'pending',
        requestedAt: new Date(),
      });
    } else {
      mealReq.breakfast = isBreakfast;
      mealReq.lunch = isLunch;
      mealReq.dinner = isDinner;
      mealReq.breakfastPoints = breakfastPoints;
      mealReq.lunchPoints = lunchPoints;
      mealReq.dinnerPoints = dinnerPoints;
      mealReq.totalPoints = totalPoints;
      mealReq.status = totalPoints > 0 ? 'confirmed' : 'cancelled';
      mealReq.requestedAt = new Date();
    }

    await mealReq.save();

    if (isAdmin && targetUserId) {
      await AuditLog.create({
        userId: (session.user as any).id,
        userName: session.user?.name || 'Admin',
        action: 'ADMIN_MEAL_REQUEST',
        details: `Updated meal request for user ${targetUserId} on date ${date}: Breakfast=${isBreakfast}, Lunch=${isLunch}, Dinner=${isDinner} (${totalPoints} pts)`,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Meal request updated successfully',
      request: mealReq,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


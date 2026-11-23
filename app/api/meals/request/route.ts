import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import MealRequest from '@/lib/models/MealRequest';
import User from '@/lib/models/User';
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

    // Check user document & negative balance restriction
    const userDoc = await User.findById(effectiveUserId);
    if (!userDoc) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    if (!isAdmin && (userDoc.balance === undefined || userDoc.balance <= 0)) {
      return NextResponse.json({
        success: false,
        error: `Cannot request meals: Your account balance is in deficit (LKR ${(userDoc.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}). You cannot request meals until your balance is topped up by Admin.`,
      }, { status: 403 });
    }

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

    // Existing request for this user and date
    let mealReq = await MealRequest.findOne({
      userId: effectiveUserId,
      date: queryDate,
    });

    const prevBreakfast = Boolean(mealReq?.breakfast);
    const prevLunch = Boolean(mealReq?.lunch);
    const prevDinner = Boolean(mealReq?.dinner);

    let isBreakfast = Boolean(breakfast);
    let isLunch = Boolean(lunch);
    let isDinner = Boolean(dinner);

    // Cutoff validation for today's requests in Sri Lanka:
    // Only check and restrict meals that the user is trying to CHANGE after their respective cutoffs!
    if (!isAdmin && requestDateMidnight === todayMidnight) {
      // 1. Breakfast Cutoff Validation
      if (isPastCutoff(cutoffs.breakfastCutoffTime, date)) {
        if (isBreakfast !== prevBreakfast) {
          return NextResponse.json({
            success: false,
            error: isBreakfast
              ? `Breakfast cutoff time (${cutoffs.breakfastCutoffTime}) has passed for today.`
              : `Breakfast cutoff time (${cutoffs.breakfastCutoffTime}) has passed. Breakfast cannot be cancelled now.`,
          }, { status: 400 });
        }
        // Lock breakfast to previous state
        isBreakfast = prevBreakfast;
      }

      // 2. Lunch Cutoff Validation
      if (isPastCutoff(cutoffs.lunchCutoffTime, date)) {
        if (isLunch !== prevLunch) {
          return NextResponse.json({
            success: false,
            error: isLunch
              ? `Lunch cutoff time (${cutoffs.lunchCutoffTime}) has passed for today.`
              : `Lunch cutoff time (${cutoffs.lunchCutoffTime}) has passed. Lunch cannot be cancelled now.`,
          }, { status: 400 });
        }
        // Lock lunch to previous state
        isLunch = prevLunch;
      }

      // 3. Dinner Cutoff Validation
      if (isPastCutoff(cutoffs.dinnerCutoffTime, date)) {
        if (isDinner !== prevDinner) {
          return NextResponse.json({
            success: false,
            error: isDinner
              ? `Dinner cutoff time (${cutoffs.dinnerCutoffTime}) has passed for today.`
              : `Dinner cutoff time (${cutoffs.dinnerCutoffTime}) has passed. Dinner cannot be cancelled now.`,
          }, { status: 400 });
        }
        // Lock dinner to previous state
        isDinner = prevDinner;
      }
    }

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


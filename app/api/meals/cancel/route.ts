import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import MealRequest from '@/lib/models/MealRequest';
import CutoffSettings from '@/lib/models/CutoffSettings';
import AuditLog from '@/lib/models/AuditLog';
import { normalizeDate, isPastCutoff } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { date, mealType, targetUserId } = await req.json();

    if (!date) {
      return NextResponse.json({ success: false, error: 'Date is required' }, { status: 400 });
    }

    const isAdmin = (session.user as any).role === 'admin';
    const effectiveUserId = (isAdmin && targetUserId) ? targetUserId : (session.user as any).id;

    await connectDB();

    const queryDate = normalizeDate(new Date(date));
    const mealReq = await MealRequest.findOne({
      userId: effectiveUserId,
      date: queryDate,
    });

    if (!mealReq) {
      return NextResponse.json({ success: false, error: 'No meal request found for this date.' }, { status: 404 });
    }

    // Cutoff validation
    const cutoffs = await CutoffSettings.findOne();
    const now = new Date();
    const isToday = normalizeDate(now).getTime() === queryDate.getTime();

    if (!isAdmin && isToday && cutoffs) {
      if (mealType === 'breakfast') {
        if (isPastCutoff(cutoffs.breakfastCutoffTime, date)) {
          return NextResponse.json({ success: false, error: 'Breakfast cutoff has passed. Cannot cancel.' }, { status: 400 });
        }
        mealReq.breakfast = false;
        mealReq.breakfastPoints = 0;
      } else if (mealType === 'lunch') {
        if (isPastCutoff(cutoffs.lunchCutoffTime, date)) {
          return NextResponse.json({ success: false, error: 'Lunch cutoff has passed. Cannot cancel.' }, { status: 400 });
        }
        mealReq.lunch = false;
        mealReq.lunchPoints = 0;
      } else if (mealType === 'dinner') {
        if (isPastCutoff(cutoffs.dinnerCutoffTime, date)) {
          return NextResponse.json({ success: false, error: 'Dinner cutoff has passed. Cannot cancel.' }, { status: 400 });
        }
        mealReq.dinner = false;
        mealReq.dinnerPoints = 0;
      } else {
        // Cancel all meals where cutoff hasn't passed
        const canCancelBreakfast = !isPastCutoff(cutoffs.breakfastCutoffTime, date);
        const canCancelLunch = !isPastCutoff(cutoffs.lunchCutoffTime, date);
        const canCancelDinner = !isPastCutoff(cutoffs.dinnerCutoffTime, date);

        if (!canCancelBreakfast && !canCancelLunch && !canCancelDinner) {
          return NextResponse.json({ success: false, error: 'Cutoff times have passed for all meals today. Cannot cancel.' }, { status: 400 });
        }

        if (canCancelBreakfast) {
          mealReq.breakfast = false;
          mealReq.breakfastPoints = 0;
        }
        if (canCancelLunch) {
          mealReq.lunch = false;
          mealReq.lunchPoints = 0;
        }
        if (canCancelDinner) {
          mealReq.dinner = false;
          mealReq.dinnerPoints = 0;
        }
      }
    } else {
      if (mealType === 'breakfast') {
        mealReq.breakfast = false;
        mealReq.breakfastPoints = 0;
      } else if (mealType === 'lunch') {
        mealReq.lunch = false;
        mealReq.lunchPoints = 0;
      } else if (mealType === 'dinner') {
        mealReq.dinner = false;
        mealReq.dinnerPoints = 0;
      } else {
        mealReq.breakfast = false;
        mealReq.lunch = false;
        mealReq.dinner = false;
        mealReq.breakfastPoints = 0;
        mealReq.lunchPoints = 0;
        mealReq.dinnerPoints = 0;
      }
    }

    mealReq.totalPoints = mealReq.breakfastPoints + mealReq.lunchPoints + mealReq.dinnerPoints;
    if (mealReq.totalPoints === 0) {
      mealReq.status = 'cancelled';
    }

    await mealReq.save();

    await AuditLog.create({
      userId: (session.user as any).id,
      userName: session.user?.name || 'User',
      action: 'CANCEL_MEAL_REQUEST',
      details: `Cancelled ${mealType || 'all meals'} on ${date} for user ${effectiveUserId}. Refunded points.`,
    });

    return NextResponse.json({
      success: true,
      message: 'Meal request cancelled and points refunded.',
      request: mealReq,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


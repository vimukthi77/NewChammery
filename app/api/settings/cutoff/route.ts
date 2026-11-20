import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import CutoffSettings from '@/lib/models/CutoffSettings';
import AuditLog from '@/lib/models/AuditLog';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await connectDB();
    let settings = await CutoffSettings.findOne();
    if (!settings) {
      settings = await CutoffSettings.create({
        breakfastCutoffTime: '07:00',
        lunchCutoffTime: '10:00',
        dinnerCutoffTime: '15:00',
      });
    }
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Cutoff GET error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Database error fetching cutoffs' }, { status: 500 });
  }
}

async function handleUpdate(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin session required. Please log in again.' },
        { status: 403 }
      );
    }

    let body: any = {};
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON request payload' }, { status: 400 });
    }

    const { breakfastCutoffTime, lunchCutoffTime, dinnerCutoffTime } = body;

    if (!breakfastCutoffTime || !lunchCutoffTime || !dinnerCutoffTime) {
      return NextResponse.json({ success: false, error: 'All cutoff times are required (HH:mm format).' }, { status: 400 });
    }

    await connectDB();
    let settings = await CutoffSettings.findOne();
    if (!settings) {
      settings = new CutoffSettings();
    }

    settings.breakfastCutoffTime = breakfastCutoffTime;
    settings.lunchCutoffTime = lunchCutoffTime;
    settings.dinnerCutoffTime = dinnerCutoffTime;

    const currentUserId = (session.user as any)?.id;
    if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      settings.updatedBy = currentUserId;
    }
    await settings.save();

    if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      await AuditLog.create({
        userId: currentUserId,
        userName: session.user?.name || 'Admin',
        action: 'UPDATE_CUTOFF_TIMES',
        details: `Updated cutoffs to Breakfast: ${breakfastCutoffTime}, Lunch: ${lunchCutoffTime}, Dinner: ${dinnerCutoffTime}`,
      }).catch((err) => console.error('AuditLog insert failed:', err));
    }

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error('Cutoff update error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update cutoff times' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  return handleUpdate(req);
}

export async function POST(req: Request) {
  return handleUpdate(req);
}

export async function PATCH(req: Request) {
  return handleUpdate(req);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, PUT, PATCH, OPTIONS',
    },
  });
}

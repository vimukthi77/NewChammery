import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import CutoffSettings from '@/lib/models/CutoffSettings';
import AuditLog from '@/lib/models/AuditLog';

export async function GET() {
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { breakfastCutoffTime, lunchCutoffTime, dinnerCutoffTime } = await req.json();

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
    settings.updatedBy = (session.user as any).id;
    await settings.save();

    await AuditLog.create({
      userId: (session.user as any).id,
      userName: session.user?.name || 'Admin',
      action: 'UPDATE_CUTOFF_TIMES',
      details: `Updated cutoffs to Breakfast: ${breakfastCutoffTime}, Lunch: ${lunchCutoffTime}, Dinner: ${dinnerCutoffTime}`,
    });

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


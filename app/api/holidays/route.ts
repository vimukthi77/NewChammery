import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Holiday from '@/lib/models/Holiday';
import AuditLog from '@/lib/models/AuditLog';
import { normalizeDate } from '@/lib/utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // YYYY-MM

    await connectDB();
    const query: any = {};
    if (month) {
      const [year, m] = month.split('-').map(Number);
      const start = new Date(Date.UTC(year, m - 1, 1));
      const end = new Date(Date.UTC(year, m, 0, 23, 59, 59));
      query.date = { $gte: start, $lte: end };
    }

    const holidays = await Holiday.find(query).sort({ date: 1 });
    return NextResponse.json({ success: true, holidays });
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

    const { date, title, isWeekend = false } = await req.json();
    if (!date || !title) {
      return NextResponse.json({ success: false, error: 'Date and title are required.' }, { status: 400 });
    }

    await connectDB();
    const normalized = normalizeDate(new Date(date));

    const holiday = await Holiday.findOneAndUpdate(
      { date: normalized },
      {
        date: normalized,
        title,
        isWeekend,
        createdBy: (session.user as any).id,
      },
      { upsert: true, new: true }
    );

    await AuditLog.create({
      userId: (session.user as any).id,
      userName: session.user?.name || 'Admin',
      action: 'ADD_HOLIDAY',
      details: `Added holiday/closure: ${title} on ${date}`,
    });

    return NextResponse.json({ success: true, holiday });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Holiday ID required.' }, { status: 400 });
    }

    await connectDB();
    await Holiday.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Holiday deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


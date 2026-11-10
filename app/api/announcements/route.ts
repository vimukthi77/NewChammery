import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Announcement from '@/lib/models/Announcement';
import AuditLog from '@/lib/models/AuditLog';

export async function GET() {
  try {
    await connectDB();
    const announcements = await Announcement.find({ active: true }).sort({ createdAt: -1 }).limit(5);
    return NextResponse.json({ success: true, announcements });
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

    const { title, message, priority = 'info' } = await req.json();
    if (!title || !message) {
      return NextResponse.json({ success: false, error: 'Title and message are required.' }, { status: 400 });
    }

    await connectDB();
    const announcement = await Announcement.create({
      title,
      message,
      priority,
      active: true,
      createdBy: (session.user as any).id,
    });

    await AuditLog.create({
      userId: (session.user as any).id,
      userName: session.user?.name || 'Admin',
      action: 'CREATE_ANNOUNCEMENT',
      details: `Created announcement: ${title}`,
    });

    return NextResponse.json({ success: true, announcement });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


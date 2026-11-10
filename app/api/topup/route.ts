import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Topup from '@/lib/models/Topup';
import User from '@/lib/models/User';
import AuditLog from '@/lib/models/AuditLog';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get('userId');
    const monthParam = searchParams.get('month');

    const isAdmin = (session.user as any).role === 'admin';
    const effectiveUserId = (isAdmin && userIdParam) ? userIdParam : (isAdmin && !userIdParam ? null : (session.user as any).id);

    await connectDB();

    const query: any = {};
    if (effectiveUserId) {
      query.userId = effectiveUserId;
    }
    if (monthParam) {
      query.month = monthParam;
    }

    const topups = await Topup.find(query)
      .populate('userId', 'name email profileImage')
      .populate('addedBy', 'name')
      .sort({ createdAt: -1 });

    // Calculate totals
    const totalPoints = topups.reduce((sum, t) => sum + (t.points || 0), 0);
    const totalAmount = topups.reduce((sum, t) => sum + (t.amount || 0), 0);

    return NextResponse.json({
      success: true,
      topups,
      totalPoints,
      totalAmount,
    });
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

    const body = await req.json();
    const { userId, points, amount = 0, month, description = 'Monthly allocation' } = body;

    if (!userId || points === undefined || points === null) {
      return NextResponse.json({ success: false, error: 'User ID and Points are required.' }, { status: 400 });
    }

    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const parsedPoints = Number(points);
    const parsedAmount = Number(amount) || 0;
    const adminId = (session.user as any).id;

    await connectDB();

    if (userId === 'all') {
      // Bulk topup for all active users
      const activeUsers = await User.find({ isActive: true, role: 'user' });
      const topupDocs = activeUsers.map((u) => ({
        userId: u._id,
        amount: parsedAmount,
        points: parsedPoints,
        month: currentMonth,
        description: description || `Bulk allocation - ${currentMonth}`,
        addedBy: adminId,
      }));

      const created = await Topup.insertMany(topupDocs);

      await AuditLog.create({
        userId: adminId,
        userName: session.user?.name || 'Admin',
        action: 'BULK_TOPUP',
        details: `Bulk allocated ${parsedPoints} points (${parsedAmount} LKR) to ${activeUsers.length} users for month ${currentMonth}. Description: ${description}`,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully allocated points to ${activeUsers.length} users.`,
        count: created.length,
      });
    }

    // Single user topup / adjustment
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Target user not found.' }, { status: 404 });
    }

    const newTopup = await Topup.create({
      userId: targetUser._id,
      amount: parsedAmount,
      points: parsedPoints,
      month: currentMonth,
      description: description || `Allocation - ${currentMonth}`,
      addedBy: adminId,
    });

    await AuditLog.create({
      userId: adminId,
      userName: session.user?.name || 'Admin',
      action: parsedPoints < 0 ? 'DEDUCT_POINTS' : 'ADD_TOPUP',
      details: `${parsedPoints < 0 ? 'Deducted' : 'Added'} ${Math.abs(parsedPoints)} points (${parsedAmount} LKR) for ${targetUser.name} (${targetUser.email}). Reason: ${description}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Topup added successfully.',
      topup: newTopup,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


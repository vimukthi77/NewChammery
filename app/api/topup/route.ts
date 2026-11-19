import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Topup from '@/lib/models/Topup';
import User from '@/lib/models/User';
import AuditLog from '@/lib/models/AuditLog';

export const dynamic = 'force-dynamic';

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
    const {
      userId,
      points = 0,
      amount = 0,
      month,
      type,
      description = 'Monthly balance top-up',
      date,
    } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });
    }

    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const parsedPoints = Number(points) || 0;
    const parsedAmount = Number(amount) || 0;
    const adminId = (session.user as any).id;
    const determinedType = type || (parsedAmount > 0 ? 'topup' : 'points_adjustment');
    const recordDate = date ? new Date(date) : new Date();

    await connectDB();

    if (type === 'set_balance') {
      const targetBalance = parsedAmount;
      if (userId === 'all') {
        const activeUsers = await User.find({ isActive: true, role: 'user' });
        const topupDocs = activeUsers.map((u) => {
          const old = typeof u.balance === 'number' ? u.balance : 0;
          const diff = targetBalance - old;
          return {
            userId: u._id,
            amount: diff,
            points: 0,
            type: diff >= 0 ? 'topup' : 'settlement_deduction',
            month: currentMonth,
            description: description || `Bulk set balance to LKR ${targetBalance.toLocaleString()}`,
            addedBy: adminId,
            createdAt: recordDate,
          };
        });

        await Topup.insertMany(topupDocs);
        await User.updateMany({ isActive: true, role: 'user' }, { $set: { balance: targetBalance } });

        await AuditLog.create({
          userId: adminId,
          userName: session.user?.name || 'Admin',
          action: 'BULK_SET_BALANCE',
          details: `Directly set balance to LKR ${targetBalance.toLocaleString()} for all ${activeUsers.length} staff users. Note: ${description}`,
        });

        return NextResponse.json({
          success: true,
          message: `Successfully set balance to LKR ${targetBalance.toLocaleString()} for ${activeUsers.length} users.`,
        });
      }

      // Single user set balance
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        return NextResponse.json({ success: false, error: 'Target user not found.' }, { status: 404 });
      }

      const oldBal = typeof targetUser.balance === 'number' ? targetUser.balance : 0;
      const diff = targetBalance - oldBal;
      targetUser.balance = targetBalance;
      await targetUser.save();

      const newTopup = await Topup.create({
        userId: targetUser._id,
        amount: diff,
        points: 0,
        type: diff >= 0 ? 'topup' : 'settlement_deduction',
        month: currentMonth,
        description: description || `Admin set balance from LKR ${oldBal.toLocaleString()} to LKR ${targetBalance.toLocaleString()}`,
        addedBy: adminId,
        createdAt: recordDate,
      });

      await AuditLog.create({
        userId: adminId,
        userName: session.user?.name || 'Admin',
        action: 'SET_USER_BALANCE',
        details: `Set balance for ${targetUser.name} (${targetUser.email}) from LKR ${oldBal} to LKR ${targetBalance}. Diff: ${diff >= 0 ? '+' : ''}${diff}. Reason: ${description}`,
      });

      return NextResponse.json({
        success: true,
        message: `Balance for ${targetUser.name} set to LKR ${targetBalance.toLocaleString()}`,
        newBalance: targetUser.balance,
        topup: newTopup,
      });
    }

    if (userId === 'all') {
      // Bulk topup for all active users
      const activeUsers = await User.find({ isActive: true, role: 'user' });
      const topupDocs = activeUsers.map((u) => ({
        userId: u._id,
        amount: parsedAmount,
        points: parsedPoints,
        type: determinedType,
        month: currentMonth,
        description: description || `Bulk allocation - ${currentMonth}`,
        addedBy: adminId,
        createdAt: recordDate,
      }));

      const created = await Topup.insertMany(topupDocs);

      // Increment monetary balance for all users if amount > 0
      if (parsedAmount !== 0) {
        await User.updateMany(
          { isActive: true, role: 'user' },
          { $inc: { balance: parsedAmount } }
        );
      }

      await AuditLog.create({
        userId: adminId,
        userName: session.user?.name || 'Admin',
        action: 'BULK_TOPUP',
        details: `Bulk allocated ${parsedPoints} points (${parsedAmount} LKR) to ${activeUsers.length} users for month ${currentMonth}. Description: ${description}`,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully processed topup/points for ${activeUsers.length} users.`,
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
      type: determinedType,
      month: currentMonth,
      description: description || `Topup / Points Adjustment - ${currentMonth}`,
      addedBy: adminId,
      createdAt: recordDate,
    });

    // Update target user's monetary balance if amount specified
    if (parsedAmount !== 0) {
      targetUser.balance = (targetUser.balance ?? 0) + parsedAmount;
      await targetUser.save();
    }

    await AuditLog.create({
      userId: adminId,
      userName: session.user?.name || 'Admin',
      action: determinedType === 'points_adjustment' ? 'ADD_POINTS_ADJUSTMENT' : 'ADD_TOPUP',
      details: `${parsedAmount > 0 ? `Added LKR ${parsedAmount}` : ''} ${parsedPoints !== 0 ? `${parsedPoints} points` : ''} for ${targetUser.name} (${targetUser.email}). Reason: ${description}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Transaction saved successfully.',
      topup: newTopup,
      newBalance: targetUser.balance,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import MealRequest from '@/lib/models/MealRequest';
import Topup from '@/lib/models/Topup';
import AuditLog from '@/lib/models/AuditLog';
import { generateSecurePassword } from '@/lib/utils';
import { sendWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    // User can only view themselves unless admin
    if ((session.user as any)?.role !== 'admin' && (session.user as any)?.id !== id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const user = await User.findById(id).select('-password');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const meals = await MealRequest.find({ userId: id }).sort({ date: -1 }).limit(100);
    const topups = await Topup.find({ userId: id }).sort({ createdAt: -1 });

    const adjPoints = topups
      .filter((t) => t.type === 'points_adjustment')
      .reduce((acc, curr) => acc + (curr.points || 0), 0);
    const mealPointsUsed = meals
      .filter((m) => m.status !== 'cancelled')
      .reduce((acc, curr) => acc + (curr.totalPoints || 0), 0);
    const totalUsed = Math.max(0, mealPointsUsed + adjPoints);
    const totalAllocated = topups
      .filter((t) => t.type !== 'points_adjustment')
      .reduce((acc, curr) => acc + (curr.points || 0), 0);
    const pointBalance = totalAllocated - totalUsed;
    const monetaryBalance = typeof user.balance === 'number' ? user.balance : 0;

    return NextResponse.json({
      success: true,
      user,
      stats: {
        totalAllocated,
        totalUsed,
        balance: pointBalance,
        pointBalance,
        monetaryBalance,
      },
      meals,
      topups,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { name, email, role, isActive, balance, resetPassword, startDate } = body;

    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const oldBalance = typeof user.balance === 'number' ? user.balance : 0;
    const isBalanceChanged = typeof balance === 'number' && balance !== oldBalance;

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (role && ['admin', 'user', 'cook'].includes(role)) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (typeof balance === 'number') user.balance = balance;
    if (startDate) user.startDate = new Date(startDate);

    let newPassword = null;
    let emailSent = false;
    if (resetPassword) {
      newPassword = generateSecurePassword(8);
      user.password = await bcrypt.hash(newPassword, 12);
      try {
        await sendWelcomeEmail({
          to: user.email,
          name: user.name,
          password: newPassword,
        });
        emailSent = true;
      } catch (e) {
        console.error('Password reset email error:', e);
      }
    }

    await user.save();

    if (isBalanceChanged) {
      const diff = balance - oldBalance;
      const currentMonth = new Date().toISOString().slice(0, 7);
      await Topup.create({
        userId: user._id,
        amount: diff,
        points: 0,
        type: diff >= 0 ? 'topup' : 'settlement_deduction',
        month: currentMonth,
        description: body.reason || `Admin updated balance from LKR ${oldBalance.toLocaleString()} to LKR ${balance.toLocaleString()}`,
        addedBy: (session.user as any).id,
      });

      await AuditLog.create({
        userId: (session.user as any).id,
        userName: session.user?.name || 'Admin',
        action: 'UPDATE_USER_BALANCE',
        details: `Changed balance for ${user.name} (${user.email}) from LKR ${oldBalance} to LKR ${balance} (diff: ${diff >= 0 ? '+' : ''}${diff}). Reason: ${body.reason || 'Admin balance update'}`,
      });
    } else {
      await AuditLog.create({
        userId: (session.user as any).id,
        userName: session.user?.name || 'Admin',
        action: 'UPDATE_USER',
        details: `Updated user ${user.name} (${user.email}). Reset password: ${resetPassword ? 'Yes' : 'No'}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: isBalanceChanged ? `Balance updated to LKR ${user.balance.toLocaleString()}` : 'User updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        balance: user.balance,
      },
      newPassword,
      emailSent,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { id } = params;
    if ((session.user as any).id === id) {
      return NextResponse.json({ success: false, error: 'You cannot delete your own admin account.' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    await AuditLog.create({
      userId: (session.user as any).id,
      userName: session.user?.name || 'Admin',
      action: 'DELETE_USER',
      details: `Deleted user ${user.name} (${user.email})`,
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


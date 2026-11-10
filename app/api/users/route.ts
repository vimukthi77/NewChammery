import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import Topup from '@/lib/models/Topup';
import MealRequest from '@/lib/models/MealRequest';
import AuditLog from '@/lib/models/AuditLog';
import { generateSecurePassword } from '@/lib/utils';
import { sendWelcomeEmail } from '@/lib/email';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');

    await connectDB();

    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const users = await User.find(query).sort({ createdAt: -1 }).select('-password');

    // Aggregate points for each user
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        // Topups points
        const topups = await Topup.aggregate([
          { $match: { userId: u._id } },
          { $group: { _id: null, totalPoints: { $sum: '$points' }, totalAmount: { $sum: '$amount' } } },
        ]);
        const allocatedPoints = topups[0]?.totalPoints || 0;
        const totalTopupAmount = topups[0]?.totalAmount || 0;

        // Meal requests points
        const meals = await MealRequest.aggregate([
          { $match: { userId: u._id, status: { $ne: 'cancelled' } } },
          { $group: { _id: null, totalPoints: { $sum: '$totalPoints' } } },
        ]);
        const usedPoints = meals[0]?.totalPoints || 0;
        const remainingPoints = allocatedPoints - usedPoints;

        return {
          ...u.toObject(),
          allocatedPoints,
          usedPoints,
          remainingPoints,
          totalTopupAmount,
        };
      })
    );

    return NextResponse.json({ success: true, users: usersWithStats });
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
    const { name, email, role = 'user', initialPoints = 0, initialAmount = 0 } = body;

    if (!name || !email) {
      return NextResponse.json({ success: false, error: 'Name and email are required.' }, { status: 400 });
    }

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'A user with this email already exists.' }, { status: 400 });
    }

    const autoPassword = generateSecurePassword(8);
    const hashedPassword = await bcrypt.hash(autoPassword, 12);

    let assignedRole = 'user';
    if (role === 'admin') assignedRole = 'admin';
    else if (role === 'cook') assignedRole = 'cook';

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: assignedRole,
      isActive: true,
    });

    // If initial points provided, create initial topup
    if (Number(initialPoints) > 0 || Number(initialAmount) > 0) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      await Topup.create({
        userId: newUser._id,
        amount: Number(initialAmount) || 0,
        points: Number(initialPoints) || 0,
        month: currentMonth,
        description: 'Initial allocation on account creation',
        addedBy: (session.user as any).id,
      });
    }

    // Try sending welcome email
    let emailSent = false;
    let emailError = null;
    try {
      await sendWelcomeEmail({
        to: newUser.email,
        name: newUser.name,
        password: autoPassword,
      });
      emailSent = true;
    } catch (err: any) {
      console.error('Failed to send welcome email:', err);
      emailError = err.message;
    }

    await AuditLog.create({
      userId: (session.user as any).id,
      userName: session.user?.name || 'Admin',
      action: 'CREATE_USER',
      details: `Created user ${newUser.name} (${newUser.email}) with role ${newUser.role}. Email status: ${emailSent ? 'sent' : 'failed'}`,
    });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
      },
      generatedPassword: autoPassword,
      emailSent,
      emailError,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


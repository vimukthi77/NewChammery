import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import CutoffSettings from '@/lib/models/CutoffSettings';

export async function GET() {
  try {
    await connectDB();

    // Check or create Admin
    let admin = await User.findOne({ email: 'admin@chammery.com' });
    if (!admin) {
      const hashedPassword = await bcrypt.hash('Admin@123', 12);
      admin = await User.create({
        name: 'System Admin',
        email: 'admin@chammery.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      });
    }

    // Check or create Cook
    let cook = await User.findOne({ email: 'cook@chammery.com' });
    if (!cook) {
      const hashedPassword = await bcrypt.hash('Cook@123', 12);
      cook = await User.create({
        name: 'Kitchen Chef',
        email: 'cook@chammery.com',
        password: hashedPassword,
        role: 'cook',
        isActive: true,
      });
    }

    // Check or create default cutoffs
    let cutoffs = await CutoffSettings.findOne();
    if (!cutoffs) {
      cutoffs = await CutoffSettings.create({
        breakfastCutoffTime: '07:00',
        lunchCutoffTime: '10:00',
        dinnerCutoffTime: '15:00',
        updatedBy: admin._id,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'System seeded successfully',
      admin: {
        email: admin.email,
        role: admin.role,
      },
      cook: {
        email: cook.email,
        role: cook.role,
      },
      cutoffs,
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


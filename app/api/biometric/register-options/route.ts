import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import BiometricCredential from '@/lib/models/BiometricCredential';

const RP_NAME = process.env.RP_NAME || 'Chammery Meal Management';
const RP_ID = process.env.RP_ID || 'localhost';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const userId = (session.user as any).id;
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get existing credentials to exclude
    const userCredentials = await BiometricCredential.find({ userId });
    const excludeCredentials = userCredentials.map((cred) => ({
      id: Buffer.from(cred.credentialId, 'base64url'),
      type: 'public-key' as const,
      transports: (cred.transports || ['internal']) as any,
    }));

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: user._id.toString(),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    return NextResponse.json({ success: true, options });
  } catch (error: any) {
    console.error('Biometric register-options error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

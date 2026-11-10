import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import BiometricCredential from '@/lib/models/BiometricCredential';

const RP_ID = process.env.RP_ID || 'localhost';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !(session.user as any)?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { response, challenge, deviceName } = await req.json();

    const origin = req.headers.get('origin') || process.env.ORIGIN || 'http://localhost:3000';

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: RP_ID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;
      const credentialIdBase64 = Buffer.from(credentialID).toString('base64url');
      const publicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64');

      await connectDB();
      const userId = (session.user as any).id;

      // Upsert biometric credential
      await BiometricCredential.findOneAndUpdate(
        { credentialId: credentialIdBase64 },
        {
          userId,
          credentialId: credentialIdBase64,
          publicKey: publicKeyBase64,
          counter,
          deviceName: deviceName || 'Mobile Biometrics',
          transports: response.response?.transports || ['internal'],
        },
        { upsert: true, new: true }
      );

      // Link to User
      await User.findByIdAndUpdate(userId, {
        biometricCredentialId: credentialIdBase64,
        biometricPublicKey: publicKeyBase64,
      });

      return NextResponse.json({
        success: true,
        verified: true,
        credentialId: credentialIdBase64,
        message: 'Biometric registration completed successfully!',
      });
    }

    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 400 });
  } catch (error: any) {
    console.error('Verify registration error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


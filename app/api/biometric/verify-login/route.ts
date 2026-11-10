import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import BiometricCredential from '@/lib/models/BiometricCredential';
import { getWebAuthnConfig } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const { response, challenge, clientHostname, clientOrigin } = await req.json();

    await connectDB();

    const credentialId = response?.id;
    if (!credentialId) {
      return NextResponse.json({ success: false, error: 'Invalid response from biometric sensor' }, { status: 400 });
    }

    const credential = await BiometricCredential.findOne({ credentialId });
    if (!credential) {
      return NextResponse.json({ success: false, error: 'Credential not recognized. Please login with password.' }, { status: 400 });
    }

    const user = await User.findById(credential.userId);
    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, error: 'User account not active or found.' }, { status: 403 });
    }

    const { rpID, origin } = getWebAuthnConfig(req, clientHostname, clientOrigin);

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: Buffer.from(credential.credentialId, 'base64url'),
        credentialPublicKey: Buffer.from(credential.publicKey, 'base64'),
        counter: credential.counter,
      },
    });

    if (verification.verified) {
      const { newCounter } = verification.authenticationInfo;
      credential.counter = newCounter;
      await credential.save();

      return NextResponse.json({
        success: true,
        verified: true,
        userId: user._id.toString(),
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Authentication verification failed' }, { status: 400 });
  } catch (error: any) {
    console.error('Verify biometric login error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

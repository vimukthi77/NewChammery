import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import BiometricCredential from '@/lib/models/BiometricCredential';
import { getWebAuthnConfig } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, clientHostname, clientOrigin } = body;

    const { rpID } = getWebAuthnConfig(req, clientHostname, clientOrigin);

    await connectDB();

    let allowCredentials = undefined;

    if (email) {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (user) {
        const credentials = await BiometricCredential.find({ userId: user._id });
        if (credentials.length > 0) {
          allowCredentials = credentials.map((cred) => ({
            id: Buffer.from(cred.credentialId, 'base64url'),
            type: 'public-key' as const,
            transports: (cred.transports || ['internal']) as any,
          }));
        }
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    return NextResponse.json({ success: true, options });
  } catch (error: any) {
    console.error('Biometric login-options error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

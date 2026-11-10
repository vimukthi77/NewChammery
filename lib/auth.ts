import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        isBiometric: { label: 'Biometric', type: 'text' },
        biometricUserId: { label: 'BiometricUserId', type: 'text' },
      },
      async authorize(credentials) {
        await connectDB();

        // Biometric login pathway
        if (credentials?.isBiometric === 'true' && credentials?.biometricUserId) {
          const user = await User.findById(credentials.biometricUserId);
          if (!user || !user.isActive) {
            throw new Error('Biometric user account is inactive or not found');
          }
          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            image: user.profileImage || null,
          };
        }

        // Standard Email + Password pathway
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter both email and password');
        }

        const user = await User.findOne({ email: credentials.email.toLowerCase().trim() });
        if (!user) {
          throw new Error('Invalid email or password');
        }

        if (!user.isActive) {
          throw new Error('Your account has been deactivated. Please contact admin.');
        }

        const isPasswordMatch = await bcrypt.compare(credentials.password, user.password || '');
        if (!isPasswordMatch) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.profileImage || null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.name = user.name;
        token.email = user.email;
      }
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name;
        if (session.image) token.picture = session.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        session.user.name = token.name;
        session.user.email = token.email;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If baseUrl is pointing to localhost but running in production / Vercel
      let effectiveBase = baseUrl;
      if (effectiveBase.includes('localhost') && process.env.VERCEL_URL) {
        effectiveBase = `https://${process.env.VERCEL_URL}`;
      } else if (effectiveBase.includes('localhost') && process.env.NODE_ENV === 'production') {
        effectiveBase = 'https://new-chammery.vercel.app';
      }

      // Allows relative URLs
      if (url.startsWith('/')) {
        return `${effectiveBase.replace(/\/$/, '')}${url}`;
      }

      // Allows URLs on the same deployment or origin
      try {
        const targetUrl = new URL(url);
        if (targetUrl.hostname.includes('vercel.app') || targetUrl.hostname === 'localhost') {
          return url;
        }
      } catch {}

      return effectiveBase;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'chammery-secret-key-2024-super-secure',
};


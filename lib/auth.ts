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
      // 1. If url is a relative URL (e.g. '/login', '/dashboard'), keep it relative!
      // This guarantees the browser stays on the current domain without any cross-domain jumps!
      if (url.startsWith('/')) {
        return url;
      }

      // 2. Parse absolute target URL
      try {
        const targetUrl = new URL(url);
        // Explicitly block any redirect to vercel.com platform login
        if (targetUrl.hostname === 'vercel.com' || targetUrl.hostname.endsWith('.vercel.com')) {
          return '/login';
        }

        // Allow if same origin as baseUrl or canonical domain
        if (
          targetUrl.origin === baseUrl ||
          targetUrl.hostname === 'new-chammery.vercel.app' ||
          targetUrl.hostname === 'localhost' ||
          targetUrl.hostname.includes('127.0.0.1')
        ) {
          return url;
        }
      } catch {}

      return '/login';
    },
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-next-auth.session-token' : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
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


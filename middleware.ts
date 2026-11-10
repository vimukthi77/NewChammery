import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin access vs User access separation
    if (token?.role === 'admin') {
      // Admin should only access admin portal & profile, never meal requesting
      if (
        path === '/dashboard' ||
        path.startsWith('/dashboard') ||
        path === '/meals' ||
        path.startsWith('/meals') ||
        path === '/history' ||
        path.startsWith('/history') ||
        path === '/balance' ||
        path.startsWith('/balance')
      ) {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }
    } else {
      // Regular user cannot access admin routes
      if (path.startsWith('/admin')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Allow public paths
        if (
          path === '/' ||
          path === '/login' ||
          path.startsWith('/api/auth') ||
          path.startsWith('/api/seed') ||
          path.startsWith('/api/biometric/login') ||
          path.startsWith('/_next') ||
          path.startsWith('/images') ||
          path === '/favicon.ico' ||
          path === '/manifest.json'
        ) {
          return true;
        }

        // Require token for user and admin routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/meals/:path*',
    '/history/:path*',
    '/balance/:path*',
    '/profile/:path*',
    '/admin/:path*',
  ],
};


import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const role = token?.role;

    // 1. Cook access separation
    if (role === 'cook') {
      // Cook can only access /cook/* and /profile/*
      if (
        path === '/dashboard' ||
        path.startsWith('/dashboard') ||
        path === '/meals' ||
        path.startsWith('/meals') ||
        path === '/history' ||
        path.startsWith('/history') ||
        path === '/balance' ||
        path.startsWith('/balance') ||
        path.startsWith('/admin')
      ) {
        return NextResponse.redirect(new URL('/cook/dashboard', req.url));
      }
    }
    // 2. Admin access separation
    else if (role === 'admin') {
      // Admin should access admin portal, cook portal, and profile, never meal requesting
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
    }
    // 3. Regular user access separation
    else {
      // Regular user cannot access admin or cook routes
      if (path.startsWith('/admin') || path.startsWith('/cook')) {
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

        // Require token for protected routes
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
    '/cook/:path*',
  ],
};

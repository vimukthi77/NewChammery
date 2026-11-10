'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1A1A2E',
            color: '#FFF8F0',
            borderRadius: '16px',
            padding: '12px 20px',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          },
          success: {
            iconTheme: {
              primary: '#E67E22',
              secondary: '#FFFFFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#E74C3C',
              secondary: '#FFFFFF',
            },
          },
        }}
      />
      {children}
    </SessionProvider>
  );
}


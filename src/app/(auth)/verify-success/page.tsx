import React from 'react';
import Link from 'next/link';

export default async function VerifySuccessPage(
  props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  }
) {
  const searchParams = await props.searchParams;
  const error = searchParams.error as string | undefined;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center'
    }}>
      <div style={{ maxWidth: '400px', width: '100%', padding: '32px', backgroundColor: '#1a1c23', borderRadius: '16px' }}>
        
        {error ? (
          <>
            <svg viewBox="0 0 24 24" width="64" height="64" stroke="#f44336" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '24px' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <h1 style={{ fontSize: '24px', marginBottom: '16px', fontWeight: 600 }}>Verification Failed</h1>
            <p style={{ color: '#a0a0a0', marginBottom: '32px', lineHeight: 1.5 }}>
              {error}
            </p>
            <p style={{ color: '#a0a0a0', fontSize: '14px', marginBottom: '24px' }}>
              Your link may have expired. Please request a new verification link from the app.
            </p>
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="64" height="64" stroke="#00FF00" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '24px' }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <h1 style={{ fontSize: '24px', marginBottom: '16px', fontWeight: 600 }}>Email Verified!</h1>
            <p style={{ color: '#a0a0a0', marginBottom: '32px', lineHeight: 1.5 }}>
              Your Lynk-X account has been successfully verified. You can safely close this screen and return to the app to log in.
            </p>
          </>
        )}
        
        <Link 
          href="/dashboard" 
          style={{ 
            display: 'block',
            width: '100%', 
            padding: '16px', 
            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
            color: '#fff', 
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 600,
            transition: 'background-color 0.2s'
          }}
        >
          {error ? 'Return to Home' : 'Return where you left'}
        </Link>
      </div>
    </div>
  );
}

'use client';

import React from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#070a13',
      color: '#ffffff',
      margin: 0,
      padding: '20px',
      textAlign: 'center'
    }}>
      <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Something went wrong!</h2>
      <p style={{ color: '#94a3b8', maxWidth: '500px', marginBottom: '20px' }}>
        An unexpected error occurred.
      </p>
      <button
        onClick={() => reset()}
        style={{
          backgroundColor: '#CC7A4A',
          color: '#ffffff',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '6px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Try Again
      </button>
    </div>
  );
}

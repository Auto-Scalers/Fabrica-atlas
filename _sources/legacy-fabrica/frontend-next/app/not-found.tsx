'use client';

import React from 'react';

export default function NotFound() {
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
      <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Page Not Found</h2>
      <p style={{ color: '#94a3b8', maxWidth: '500px', marginBottom: '20px' }}>
        Could not find the requested resource.
      </p>
      <a
        href="/"
        style={{
          backgroundColor: '#e59320',
          color: '#070a13',
          textDecoration: 'none',
          padding: '10px 20px',
          borderRadius: '4px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
      >
        Return Home
      </a>
    </div>
  );
}



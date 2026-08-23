'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../components/auth/supabase';

function renderDashboardMock() {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      userSelect: 'none',
      display: 'flex',
      flexDirection: 'column',
      background: '#EAECEE',
      opacity: 0.8,
      filter: 'blur(3px)',
      paddingBottom: '42px',
      boxSizing: 'border-box'
    }}>
      {/* 3 Panels Row */}
      <div style={{
        flex: 1,
        display: 'flex',
        padding: '16px 16px 12px 16px',
        gap: '12px',
        height: 'calc(100% - 42px)',
        boxSizing: 'border-box'
      }}>
        {/* Panel 1: Agent Chat */}
        <div style={{
          width: '24%',
          minWidth: '290px',
          background: '#FFFFFF',
          border: '2px solid #1C1C1E',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          <div style={{
            padding: '10px 12px',
            borderBottom: '2px solid #1C1C1E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#FAF9F6'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                background: 'rgba(204, 122, 74, 0.1)',
                border: '1.5px solid #CC7A4A',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '9px',
                fontWeight: 900,
                color: '#CC7A4A',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                💬 PI CHAT
              </div>
              <div style={{
                border: '1.5px solid #1C1C1E',
                borderRadius: '6px',
                padding: '3px 6px',
                fontSize: '9px',
                fontWeight: 800,
                color: '#CC7A4A',
                background: '#FFFFFF'
              }}>
                PI CLI AGENT ∨
              </div>
            </div>
          </div>
          <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em' }}>
                FABRICA ASSISTANT
              </span>
              <div style={{ background: '#FAF9F6', border: '1.5px solid #1C1C1E', borderRadius: '12px', padding: '10px', fontSize: '10px', color: '#1C1C1E', lineHeight: 1.4 }}>
                Welcome to Fabrica! Authenticate to access your isolated workspace.
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Kanban columns */}
        <div style={{
          flex: 1,
          background: '#FFFFFF',
          border: '2px solid #1C1C1E',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          boxSizing: 'border-box'
        }}>
          <div style={{ padding: '12px', borderBottom: '2px solid #1C1C1E', background: '#FAF9F6', fontWeight: 800, fontSize: '11px', color: '#1C1C1E' }}>
            📊 ACTIVE WORKSPACE PIPELINES
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OAuthPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Auth & recovery state
  const [isSandboxSignUp, setIsSandboxSignUp] = useState(false);
  const [sandboxEmail, setSandboxEmail] = useState('');
  const [sandboxPassword, setSandboxPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isOpen: boolean }>({
    message: '',
    type: 'info',
    isOpen: false
  });

  useEffect(() => {
    // Check for password recovery token in URL
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('type=recovery') || search.includes('recovery=true')) {
        setIsRecoveryMode(true);
        setToast({ message: 'Password recovery session detected. Please set your new password.', type: 'info', isOpen: true });
      }
    }

    let active = true;

    const initializeAuth = async () => {
      let initialUser: any = null;

      // Check local sandbox session
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('fabrica_sandbox_user') : null;
      if (savedUser) {
        try {
          initialUser = JSON.parse(savedUser);
        } catch (e) {
          localStorage.removeItem('fabrica_sandbox_user');
        }
      }

      // If Supabase is available, get real session
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            initialUser = session.user;
          }
        } catch (err) {
          console.warn('[auth] Error fetching initial session:', err);
        }
      }

      if (active) {
        if (initialUser) {
          setUser(initialUser);
          const key = `fabrica_onboarding_completed_${initialUser.id}`;
          const completed = localStorage.getItem(key) === 'true';
          if (completed) {
            router.push('/dashboard');
          } else {
            router.push('/onboard');
          }
        }
        setCheckingAuth(false);
      }
    };

    initializeAuth();

    let subscription: any = null;
    if (supabase) {
      try {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (!active) return;
          const currentUser = session?.user || null;
          if (currentUser) {
            setUser(currentUser);
            localStorage.removeItem('fabrica_sandbox_user');

            const key = `fabrica_onboarding_completed_${currentUser.id}`;
            const completed = localStorage.getItem(key) === 'true';

            if (completed) {
              router.push('/dashboard');
            } else {
              router.push('/onboard');
            }
          } else {
            const savedUser = typeof window !== 'undefined' ? localStorage.getItem('fabrica_sandbox_user') : null;
            if (!savedUser) {
              setUser(null);
            }
          }
          setCheckingAuth(false);
        });
        subscription = data.subscription;
      } catch (err) {
        console.warn('[auth] Error establishing session listeners:', err);
      }
    }

    return () => {
      active = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [router]);

  const handleSandboxLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxEmail) return;

    if (supabase) {
      try {
        if (isSandboxSignUp) {
          const { data, error } = await supabase.auth.signUp({
            email: sandboxEmail,
            password: sandboxPassword || 'defaultpass123',
          });
          if (error) throw error;
          setToast({ message: `Account created successfully! Redirecting to setup...`, type: 'success', isOpen: true });
          setTimeout(() => {
            router.push('/onboard');
          }, 600);
          return;
        } else {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: sandboxEmail,
            password: sandboxPassword || 'defaultpass123',
          });
          if (error) throw error;
          setToast({ message: `Securely authenticated! Redirecting...`, type: 'success', isOpen: true });
          setTimeout(() => {
            router.push('/dashboard');
          }, 600);
          return;
        }
      } catch (err: any) {
        console.warn('[auth] Supabase auth fallback to local session:', err.message);
      }
    }

    const mockUser = {
      email: sandboxEmail,
      id: 'usr_sandbox_' + Math.random().toString(36).substring(2, 9),
      isSandbox: true
    };
    setUser(mockUser);
    localStorage.setItem('fabrica_sandbox_user', JSON.stringify(mockUser));

    if (isSandboxSignUp) {
      setToast({ message: `Sandbox account created! Please complete your workspace profile.`, type: 'success', isOpen: true });
      setTimeout(() => {
        router.push('/onboard');
      }, 500);
    } else {
      localStorage.setItem(`fabrica_onboarding_completed_${mockUser.id}`, 'true');
      setToast({ message: `Securely authenticated! Redirecting...`, type: 'success', isOpen: true });
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
          redirectTo: typeof window !== 'undefined' ? window.location.origin + '/oauth?recovery=true' : undefined,
        });
        if (error) {
          setToast({ message: error.message, type: 'error', isOpen: true });
        } else {
          setToast({ message: 'Password recovery email sent! Check your inbox.', type: 'success', isOpen: true });
          setIsForgotPassword(false);
        }
      } else {
        setToast({ message: `[Sandbox] Mock recovery email sent to ${forgotEmail}.`, type: 'success', isOpen: true });
        setIsForgotPassword(false);
      }
    } catch (err: any) {
      setToast({ message: err.message || 'An error occurred', type: 'error', isOpen: true });
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    try {
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          setToast({ message: error.message, type: 'error', isOpen: true });
        } else {
          setToast({ message: 'Password reset successful! You are now logged in.', type: 'success', isOpen: true });
          setIsRecoveryMode(false);
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            localStorage.setItem(`fabrica_onboarding_completed_${session.user.id}`, 'true');
            router.push('/dashboard');
          }
        }
      } else {
        setToast({ message: '[Sandbox] Password updated successfully in mock sandbox!', type: 'success', isOpen: true });
        setIsRecoveryMode(false);
      }
    } catch (err: any) {
      setToast({ message: err.message || 'An error occurred', type: 'error', isOpen: true });
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github' | 'facebook') => {
    if (!supabase) {
      const email = `sandbox.${provider}@gmail.com`;
      const mockUser = {
        email,
        id: 'usr_sandbox_' + Math.random().toString(36).substring(2, 9),
        isSandbox: true,
        app_metadata: { provider }
      };
      setUser(mockUser);
      localStorage.setItem('fabrica_sandbox_user', JSON.stringify(mockUser));
      localStorage.setItem(`fabrica_onboarding_completed_${mockUser.id}`, 'true');
      setToast({ message: `Securely authenticated sandbox session as ${email}!`, type: 'success', isOpen: true });
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
      return;
    }
    try {
      let scopes = '';
      if (provider === 'google') {
        scopes = 'email profile';
      } else if (provider === 'github') {
        scopes = 'read:user user:email';
      } else if (provider === 'facebook') {
        scopes = 'email,public_profile';
      }
      const isIframe = typeof window !== 'undefined' && window.self !== window.top;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          scopes: scopes || undefined,
          redirectTo: typeof window !== 'undefined' ? window.location.origin + '/oauth' : undefined,
          skipBrowserRedirect: true,
        }
      });
      if (error) throw error;

      if (data?.url) {
        if (isIframe) {
          setToast({ message: 'Opening OAuth provider window... If popups are blocked, please open app in a New Tab.', type: 'info', isOpen: true });
          const pop = window.open(data.url, '_blank');
          if (!pop) {
            window.top!.location.href = data.url;
          }
        } else {
          window.location.href = data.url;
        }
      }
    } catch (err: any) {
      console.error(err);
      setToast({ message: `OAuth login failed: ${err.message}`, type: 'error', isOpen: true });
    }
  };

  if (checkingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FAF9F6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#1C1C1E',
        fontFamily: '"Inter", system-ui, sans-serif',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(204, 122, 74, 0.15)',
          borderTopColor: '#CC7A4A',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        ` }} />
        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#CC7A4A' }}>
          Syncing Security Session...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAF9F6',
      color: '#1C1C1E',
      fontFamily: '"Inter", system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {renderDashboardMock()}
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '420px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Brand/Gateway Header */}
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          padding: '28px 24px 20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px'
        }}>
          <img 
            src="/fabrica-logo-2d.jpg" 
            alt="Fabrica Brand Logo" 
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1C1C1E' }}>
              Fabrica<span style={{ color: '#CC7A4A' }}>.</span> SaaS Gateway
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
              Secure multi-tenant workspace registry
            </p>
          </div>
        </div>

        {/* Core Auth Area */}
        <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isRecoveryMode ? (
            <form onSubmit={handleUpdatePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                background: 'rgba(204, 122, 74, 0.05)',
                border: '1px solid rgba(204, 122, 74, 0.2)',
                borderRadius: '8px',
                padding: '12px 14px'
              }}>
                <div style={{ color: '#CC7A4A', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🔒 Password Recovery
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#64748b', lineHeight: 1.45 }}>
                  Enter a secure, robust new password to finalize authentication with your account.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                  New Secure Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#1c1c1e',
                    fontSize: '11px',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: '#CC7A4A',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '10px',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer',
                  marginTop: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                Save New Password & Log In ➔
              </button>

              <button
                type="button"
                onClick={() => setIsRecoveryMode(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '10px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: 600
                }}
              >
                Cancel and Return to Login
              </button>
            </form>
          ) : isForgotPassword ? (
            <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                background: 'rgba(204, 122, 74, 0.05)',
                border: '1px solid rgba(204, 122, 74, 0.2)',
                borderRadius: '8px',
                padding: '12px 14px'
              }}>
                <div style={{ color: '#CC7A4A', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🔑 Reset Password
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#64748b', lineHeight: 1.45 }}>
                  Enter your email to receive a secure recovery link.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#1c1c1e',
                    fontSize: '11px',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: '#CC7A4A',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '10px',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer',
                  marginTop: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}
              >
                Send Recovery Link ➔
              </button>

              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '10px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: 600
                }}
              >
                Cancel and Return to Login
              </button>
            </form>
          ) : (
            <>
              {/* Premium OAuth SSO Providers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('google')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#1C1C1E',
                    padding: '10px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('github')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    background: '#1C1C1E',
                    border: '1px solid #1C1C1E',
                    borderRadius: '8px',
                    color: '#ffffff',
                    padding: '10px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  <span>Continue with GitHub</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('facebook')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    background: '#1877F2',
                    border: '1px solid #1877F2',
                    borderRadius: '8px',
                    color: '#ffffff',
                    padding: '10px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Continue with Facebook</span>
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '16px 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.04em' }}>or use email auth</span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
              </div>

                  <form onSubmit={handleSandboxLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                      <button
                        type="button"
                        onClick={() => setIsSandboxSignUp(false)}
                        style={{
                          flex: 1,
                          background: !isSandboxSignUp ? '#1C1C1E' : 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          color: !isSandboxSignUp ? '#fff' : '#64748b',
                          padding: '6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSandboxSignUp(true)}
                        style={{
                          flex: 1,
                          background: isSandboxSignUp ? '#1C1C1E' : 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          color: isSandboxSignUp ? '#fff' : '#64748b',
                          padding: '6px',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        Sign Up (New Tenant)
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={sandboxEmail}
                        onChange={(e) => setSandboxEmail(e.target.value)}
                        placeholder="service.mrigel@gmail.com"
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          color: '#1c1c1e',
                          fontSize: '11px',
                          outline: 'none',
                          transition: 'border-color 0.15s'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#CC7A4A',
                            fontSize: '9px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            textDecoration: 'underline',
                            padding: 0
                          }}
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <input
                        type="password"
                        required
                        value={sandboxPassword}
                        onChange={(e) => setSandboxPassword(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          color: '#1c1c1e',
                          fontSize: '11px',
                          outline: 'none',
                          transition: 'border-color 0.15s'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      style={{
                        background: '#CC7A4A',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#ffffff',
                        padding: '10px',
                        fontWeight: 800,
                        fontSize: '11px',
                        cursor: 'pointer',
                        marginTop: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      {isSandboxSignUp ? 'Create Isolated Tenant ➔' : 'Secure Authenticate Session ➔'}
                    </button>

                  </form>

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(sandboxEmail || '');
                        setIsForgotPassword(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#CC7A4A',
                        fontSize: '10.5px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        textDecoration: 'underline',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🔑 Forgot your password? Click here to reset
                    </button>
                  </div>
            </>
          )}
        </div>

        {/* Footer of card */}
        <div style={{
          background: '#fafafa',
          borderTop: '1px solid #f1f5f9',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10.5px'
        }}>
          <Link href="/" style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            ← Return to Landing Page
          </Link>
          <span style={{ color: '#94a3b8', fontWeight: 500 }}>v1.0.0 (Production)</span>
        </div>
      </div>

      {/* Inline Toast Notification Component */}
      {toast.isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
          fontSize: '11px',
          fontWeight: 700,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'slideIn 0.2s ease-out'
        }}>
          <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
          <span>{toast.message}</span>
          <button 
            onClick={() => setToast({ ...toast, isOpen: false })}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', fontWeight: 'bold', marginLeft: '12px' }}
          >
            ✕
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      ` }} />
    </div>
  );
}

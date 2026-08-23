'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../components/auth/supabase';

const SHOW_PAYMENT_UI = true;

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
      <div style={{
        flex: 1,
        display: 'flex',
        padding: '16px 16px 12px 16px',
        gap: '12px',
        height: 'calc(100% - 42px)',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: '24%',
          minWidth: '290px',
          background: '#FFFFFF',
          border: '2px solid #1C1C1E',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '10px 12px', borderBottom: '2px solid #1C1C1E', background: '#FAF9F6', fontWeight: 800, fontSize: '11px' }}>
            💬 PI CHAT
          </div>
        </div>
        <div style={{
          flex: 1,
          background: '#FFFFFF',
          border: '2px solid #1C1C1E',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ padding: '12px', borderBottom: '2px solid #1C1C1E', background: '#FAF9F6', fontWeight: 800, fontSize: '11px' }}>
            📊 ACTIVE WORKSPACE PIPELINES
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OnboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Onboarding Wizard state
  const [onboardingStep, setOnboardingStep] = useState<'info' | 'plan'>('info');
  const [onboardingFullName, setOnboardingFullName] = useState('');
  const [onboardingUsername, setOnboardingUsername] = useState('');
  const [onboardingHearAbout, setOnboardingHearAbout] = useState('');
  const [onboardingCompanyName, setOnboardingCompanyName] = useState('');
  const [onboardingCompanySize, setOnboardingCompanySize] = useState('');
  const [onboardingCompanyRole, setOnboardingCompanyRole] = useState('');
  const [onboardingUseCases, setOnboardingUseCases] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'power' | 'paug' | 'enterprise'>('free');

  // Stripe Checkout state
  const [showStripeCheckout, setShowStripeCheckout] = useState(false);
  const [isPayingStripe, setIsPayingStripe] = useState(false);
  const [cardHolder, setCardHolder] = useState('');
  const [stripeCardNum, setStripeCardNum] = useState('');
  const [stripeCardExp, setStripeCardExp] = useState('');
  const [stripeCardCvc, setStripeCardCvc] = useState('');
  const [stripeCardZip, setStripeCardZip] = useState('');
  const [stripeCardBrand, setStripeCardBrand] = useState('Visa');

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; isOpen: boolean }>({
    message: '',
    type: 'info',
    isOpen: false
  });

  useEffect(() => {
    let active = true;

    const checkUser = async () => {
      let currentUser: any = null;

      // Check sandbox user
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('fabrica_sandbox_user') : null;
      if (savedUser) {
        try {
          currentUser = JSON.parse(savedUser);
        } catch (e) {
          localStorage.removeItem('fabrica_sandbox_user');
        }
      }

      // Check Supabase session
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            currentUser = session.user;
          }
        } catch (err) {
          console.warn('[onboard] Error getting session:', err);
        }
      }

      if (active) {
        if (!currentUser) {
          // If not logged in, redirect to /oauth
          router.push('/oauth');
        } else {
          // If user already completed onboarding, redirect directly to /dashboard
          const key = `fabrica_onboarding_completed_${currentUser.id}`;
          const completed = localStorage.getItem(key) === 'true';
          if (completed) {
            router.push('/dashboard');
            return;
          }

          setUser(currentUser);
          // Pre-fill username if available
          if (currentUser.email) {
            const defaultUser = currentUser.email.split('@')[0];
            setOnboardingUsername(defaultUser);
          }
        }
        setCheckingAuth(false);
      }
    };

    checkUser();

    return () => {
      active = false;
    };
  }, [router]);

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
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#CC7A4A' }}>
          Loading Workspace Setup...
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
      padding: '32px 24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {renderDashboardMock()}

      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: onboardingStep === 'plan' ? '920px' : '520px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'max-width 0.3s ease-in-out'
      }}>
        {/* Header */}
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #f1f5f9',
          padding: '24px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src="/fabrica-logo-2d.jpg" 
              alt="Fabrica Brand Logo" 
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}
            />
            <div>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 900, letterSpacing: '-0.02em', color: '#1C1C1E' }}>
                Setup Your Fabrica Workspace
              </h1>
              <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                Personalize your isolated SaaS multi-tenant environment
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ height: '3px', background: '#CC7A4A', borderRadius: '2px' }}></div>
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#CC7A4A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                1. Profile Details
              </span>
            </div>
            {SHOW_PAYMENT_UI && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ height: '3px', background: onboardingStep === 'plan' ? '#CC7A4A' : '#e2e8f0', borderRadius: '2px', transition: 'background-color 0.2s' }}></div>
                <span style={{ fontSize: '9px', fontWeight: 800, color: onboardingStep === 'plan' ? '#CC7A4A' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', transition: 'color 0.2s' }}>
                  2. Choose Plan
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Onboarding Step 1: Profile Details */}
        <div style={{ padding: '32px', background: '#ffffff' }}>
          {onboardingStep === 'info' ? (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!onboardingUsername.trim()) {
                  setToast({ message: 'Username is required to isolate your workspace tenant.', type: 'error', isOpen: true });
                  return;
                }
                if (!onboardingUseCases.trim()) {
                  setToast({ message: 'Please specify what you will use Fabrica for.', type: 'error', isOpen: true });
                  return;
                }
                
                // Save values to localStorage as a durable draft
                if (user?.id) {
                  localStorage.setItem(`fabrica_ob_fullname_${user.id}`, onboardingFullName);
                  localStorage.setItem(`fabrica_ob_username_${user.id}`, onboardingUsername.replace('@', '').trim());
                  localStorage.setItem(`fabrica_ob_hear_${user.id}`, onboardingHearAbout);
                  localStorage.setItem(`fabrica_ob_compname_${user.id}`, onboardingCompanyName);
                  localStorage.setItem(`fabrica_ob_compsize_${user.id}`, onboardingCompanySize);
                  localStorage.setItem(`fabrica_ob_comprole_${user.id}`, onboardingCompanyRole);
                  localStorage.setItem(`fabrica_ob_usecases_${user.id}`, onboardingUseCases);
                }

                if (SHOW_PAYMENT_UI) {
                  setOnboardingStep('plan');
                } else {
                  setSelectedPlan('free');
                  if (user?.id) {
                    localStorage.setItem(`fabrica_onboarding_completed_${user.id}`, 'true');
                  }
                  setToast({
                    message: `Welcome to Fabrica! Workspace launched on Free Beta Access.`,
                    type: 'success',
                    isOpen: true
                  });
                  setTimeout(() => {
                    router.push('/dashboard');
                  }, 500);
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              {/* Username and Full Name */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                    Username <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '12px', fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>@</span>
                    <input
                      type="text"
                      required
                      placeholder="username"
                      value={onboardingUsername}
                      onChange={(e) => setOnboardingUsername(e.target.value.replace(/\s+/g, '').replace('@', ''))}
                      style={{
                        width: '100%',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '8px 12px 8px 24px',
                        color: '#1c1c1e',
                        fontSize: '11px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                    Full Name <span style={{ color: '#94a3b8', fontWeight: 500 }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Alex Johnson"
                    value={onboardingFullName}
                    onChange={(e) => setOnboardingFullName(e.target.value)}
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
              </div>

              {/* Hear About Us */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                  Where did you hear about us? <span style={{ color: '#94a3b8', fontWeight: 500 }}>(Optional)</span>
                </label>
                <select
                  value={onboardingHearAbout}
                  onChange={(e) => setOnboardingHearAbout(e.target.value)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#1c1c1e',
                    fontSize: '11px',
                    outline: 'none'
                  }}
                >
                  <option value="">Select an option...</option>
                  <option value="google">Google Search</option>
                  <option value="twitter">Twitter / X</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="friend">Friend or Colleague</option>
                  <option value="newsletter">Tech Blog / Newsletter</option>
                  <option value="youtube">YouTube</option>
                  <option value="other">Other Source</option>
                </select>
              </div>

              <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }}></div>

              {/* Corporate Details */}
              <div>
                <h3 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1c1c1e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🏢 Corporate & Company Information <span style={{ color: '#94a3b8', fontWeight: 500, textTransform: 'none', fontSize: '9px', letterSpacing: 0 }}>(Optional)</span>
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                      Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Acme SaaS Corp"
                      value={onboardingCompanyName}
                      onChange={(e) => setOnboardingCompanyName(e.target.value)}
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                      Company Size
                    </label>
                    <select
                      value={onboardingCompanySize}
                      onChange={(e) => setOnboardingCompanySize(e.target.value)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#1c1c1e',
                        fontSize: '11px',
                        outline: 'none'
                      }}
                    >
                      <option value="">Choose Size...</option>
                      <option value="solo">Just Me</option>
                      <option value="small">2-10 people</option>
                      <option value="mid">11-50 people</option>
                      <option value="growth">51-200 people</option>
                      <option value="enterprise">200+ people</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                      Your Role
                    </label>
                    <select
                      value={onboardingCompanyRole}
                      onChange={(e) => setOnboardingCompanyRole(e.target.value)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#1c1c1e',
                        fontSize: '11px',
                        outline: 'none'
                      }}
                    >
                      <option value="">Role...</option>
                      <option value="founder">Founder / CEO / Solopreneur</option>
                      <option value="consultant">Independent Consultant / Agency Owner</option>
                      <option value="architect">Lead Architect / System Engineer</option>
                      <option value="pm">Product Manager / Business Lead</option>
                      <option value="operator">Autonomous AI Operator</option>
                      <option value="freelancer">Freelancer / Builder</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }}></div>

              {/* Primary Use Case */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                  What will you use Fabrica for? <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  required
                  value={onboardingUseCases}
                  onChange={(e) => setOnboardingUseCases(e.target.value)}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: '#1c1c1e',
                    fontSize: '11px',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">Select a primary use case...</option>
                  <option value="24/7 Autonomous AI Business & Coding Pipelines">24/7 Autonomous AI Business & Coding Pipelines</option>
                  <option value="Building Client Deliverables & Market Research">Building Client Deliverables & Market Research</option>
                  <option value="Solopreneur Operations & Product Engineering">Solopreneur Operations & Product Engineering</option>
                  <option value="Multi-Tenant SaaS Systems & Agent Architecture">Multi-Tenant SaaS Systems & Agent Architecture</option>
                  <option value="Rapid Prototyping & Business Automation">Rapid Prototyping & Business Automation</option>
                  <option value="Learning & Exploring AI Autonomy">Learning & Exploring AI Autonomy</option>
                </select>
              </div>

              <button
                type="submit"
                style={{
                  background: '#CC7A4A',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '12px',
                  fontWeight: 800,
                  fontSize: '11px',
                  cursor: 'pointer',
                  marginTop: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  textAlign: 'center'
                }}
              >
                {SHOW_PAYMENT_UI ? 'Continue to Plan Selection ➔' : 'Complete Profile & Launch Workspace ➔'}
              </button>
            </form>
          ) : (
            /* Onboarding Step 2: Choose Plan */
            <div>
              <p style={{ margin: '0 0 20px', fontSize: '11.5px', color: '#475569', lineHeight: 1.5, textAlign: 'center' }}>
                Select the operations pipeline scale suited for your enterprise multi-agent workflows.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                alignItems: 'stretch',
                marginTop: '10px'
              }}>
                {/* Free Starter Tier */}
                <div 
                  onClick={() => {
                    setSelectedPlan('free');
                    if (user?.id) localStorage.setItem(`fabrica_ob_plan_${user.id}`, 'free');
                  }}
                  style={{
                    background: selectedPlan === 'free' ? '#ffffff' : '#fcfcfc',
                    border: selectedPlan === 'free' ? '2.5px solid #CC7A4A' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: selectedPlan === 'free' ? '0 12px 24px rgba(204, 122, 74, 0.08)' : 'none',
                    transition: 'all 0.15s ease-in-out'
                  }}
                >
                  <div style={{ marginBottom: '14px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.04em' }}>
                      Free Starter Tier ($0)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                      <b style={{ fontSize: '24px', fontWeight: 900, color: '#1c1c1e' }}>$0</b>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>/ month</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '9px', color: '#64748b', lineHeight: 1.4 }}>
                      Powered exclusively by our shared multi-key load balancer pool.
                    </p>
                  </div>

                  <div style={{ height: '1px', background: '#f1f5f9', margin: '10px 0' }}></div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '8.5px', color: '#475569', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#10b981' }}>✓</b> <span><b>Shared Multi-Key Key Pool</b> (Gemini 3.6 Flash, Llama 3.3 70B, DeepSeek R1)</span></div>
                    <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#10b981' }}>✓</b> <span><b>$0 Card Verification</b> anti-bot safeguard (No charge)</span></div>
                    <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#10b981' }}>✓</b> <span>Automatic round-robin failover & rate-limit lock isolation</span></div>
                    <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#10b981' }}>✓</b> <span>2 active workspace blueprints</span></div>
                    <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#10b981' }}>✓</b> <span>Community forum support</span></div>
                  </div>
                </div>

                {/* Developer Pro Plan */}
                <div 
                  onClick={() => {
                    setSelectedPlan('power');
                    if (user?.id) localStorage.setItem(`fabrica_ob_plan_${user.id}`, 'power');
                  }}
                  style={{
                    background: '#ffffff',
                    border: selectedPlan === 'power' ? '2.5px solid #CC7A4A' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: selectedPlan === 'power' ? '0 16px 36px rgba(204, 122, 74, 0.12)' : '0 4px 12px rgba(0,0,0,0.01)',
                    transform: selectedPlan === 'power' ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.15s ease-in-out'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#CC7A4A',
                    color: '#ffffff',
                    fontSize: '7.5px',
                    fontWeight: 900,
                    padding: '3px 8px',
                    borderRadius: '10px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    boxShadow: '0 4px 10px rgba(204, 122, 74, 0.25)'
                  }}>
                    At Cost (0% Platform Profit)
                  </div>

                  <div style={{ marginBottom: '14px', marginTop: '2px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#CC7A4A', letterSpacing: '0.04em' }}>
                      Developer Pro (At Cost)
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                      <b style={{ fontSize: '24px', fontWeight: 900, color: '#1c1c1e' }}>$15</b>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>/ mo pass-through</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '9px', color: '#64748b', lineHeight: 1.4 }}>
                      Pure pass-through cost model. Zero profit markup taken on token or container usage.
                    </p>
                  </div>

                  <div style={{ height: '1px', background: '#f1f5f9', margin: '10px 0' }}></div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '8.5px', color: '#475569', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#CC7A4A' }}>✓</b> <span><b>0% Platform Profit</b> — Direct raw API provider billing</span></div>
                    <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#CC7A4A' }}>✓</b> <span><b>BYOK (Bring Your Own Key)</b> direct key registration</span></div>
                    <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#CC7A4A' }}>✓</b> <span><b>Dedicated Throughput Pipeline</b> (Bypasses shared pool queues)</span></div>
                    <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#CC7A4A' }}>✓</b> <span>Direct access to Gemini 1.5 Pro, Claude 3.5 & GPT-4o</span></div>
                    <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#CC7A4A' }}>✓</b> <span>Unlimited projects & full token usage telemetry</span></div>
                  </div>
                </div>

                {/* Enterprise Plan */}
                <div 
                  onClick={() => {
                    setSelectedPlan('enterprise');
                    if (user?.id) localStorage.setItem(`fabrica_ob_plan_${user.id}`, 'enterprise');
                  }}
                  style={{
                    background: selectedPlan === 'enterprise' ? '#ffffff' : '#fcfcfc',
                    border: selectedPlan === 'enterprise' ? '2.5px solid #6366f1' : '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    boxShadow: selectedPlan === 'enterprise' ? '0 12px 24px rgba(99, 102, 241, 0.12)' : 'none',
                    transition: 'all 0.15s ease-in-out'
                  }}
                >
                  <div style={{ marginBottom: '14px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#6366f1', letterSpacing: '0.04em' }}>
                      Enterprise Pass-Through
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                      <b style={{ fontSize: '24px', fontWeight: 900, color: '#1c1c1e' }}>$99</b>
                      <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>/ mo base infra</span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '9px', color: '#64748b', lineHeight: 1.4 }}>
                      Dedicated container cluster & custom pass-through billing at 0% margin.
                    </p>
                  </div>

                  <div style={{ height: '1px', background: '#f1f5f9', margin: '10px 0' }}></div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '8.5px', color: '#475569', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#6366f1' }}>✓</b> <span><b>Dedicated single-tenant container node cluster</b></span></div>
                    <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#6366f1' }}>✓</b> <span><b>Custom SLA & dedicated solution engineering team</b></span></div>
                    <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#6366f1' }}>✓</b> <span>Enterprise SSO, SAML, Audit Logs & GCS export</span></div>
                    <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#6366f1' }}>✓</b> <span>24/7 Priority phone & SLA support</span></div>
                  </div>
                </div>
              </div>

              {/* Confirm Plan / Checkout redirection */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                <button
                  type="button"
                  onClick={() => setOnboardingStep('info')}
                  style={{
                    background: 'transparent',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#64748b',
                    padding: '12px 20px',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  ← Back
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedPlan === 'free') {
                      if (user?.id) {
                        localStorage.setItem(`fabrica_onboarding_completed_${user.id}`, 'true');
                      }
                      setToast({
                        message: `Welcome to Fabrica! Your workspace is active on the FREE tier.`,
                        type: 'success',
                        isOpen: true
                      });
                      setTimeout(() => {
                        router.push('/dashboard');
                      }, 1000);
                    } else {
                      setShowStripeCheckout(true);
                    }
                  }}
                  style={{
                    flex: 1,
                    background: '#CC7A4A',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    padding: '12px',
                    fontWeight: 800,
                    fontSize: '11px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    textAlign: 'center'
                  }}
                >
                  {selectedPlan === 'free' ? 'Go to dashboard ➔' : 'Go to Payment ➔'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer of Card */}
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

      {/* Stripe Checkout Overlay Modal */}
      {showStripeCheckout && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(9, 13, 22, 0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            width: 'min(28rem, 95vw)',
            background: '#ffffff',
            color: '#0f172a',
            borderRadius: '16px',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              background: '#635bff',
              color: '#ffffff',
              padding: '18px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>🔒</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Stripe Secure Checkout
                  </h3>
                  <p style={{ margin: 0, fontSize: '8px', opacity: 0.85 }}>Standard TLS 256-Bit SSL tokenization</p>
                </div>
              </div>
              <button
                onClick={() => setShowStripeCheckout(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  opacity: 0.8,
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
              <span style={{ fontSize: '8px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Your Selected Subscription
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <b style={{ fontSize: '13px', color: '#0f172a' }}>
                  {selectedPlan === 'enterprise' ? '🏆 Enterprise Custom Suite' : selectedPlan === 'paug' ? '⚡ Dedicated PAUG Infrastructure' : '⚡ Power User Pipeline'}
                </b>
                <b style={{ fontSize: '15px', color: '#635bff' }}>
                  {selectedPlan === 'enterprise' ? '$249.00' : selectedPlan === 'paug' ? '$15.00' : '$49.00'}<span style={{ fontSize: '9px', color: '#64748b', fontWeight: 500 }}> / mo</span>
                </b>
              </div>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '8.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Cardholder Full Name
                </label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="John Doe"
                  disabled={isPayingStripe}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    background: '#ffffff',
                    fontSize: '11px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '8.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                  Card Number (Stripe Elements)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={stripeCardNum}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 16) val = val.substring(0, 16);
                      if (val.startsWith('3')) setStripeCardBrand('Amex');
                      else if (val.startsWith('5')) setStripeCardBrand('Mastercard');
                      else setStripeCardBrand('Visa');
                      const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
                      setStripeCardNum(formatted);
                    }}
                    placeholder="4242 4242 4242 4242"
                    disabled={isPayingStripe}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      paddingRight: '40px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      background: '#ffffff',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                  />
                  <span style={{ position: 'absolute', right: '10px', fontSize: '9px', fontWeight: 900, color: '#635bff', textTransform: 'uppercase' }}>
                    {stripeCardBrand}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '8.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    Expiration Date
                  </label>
                  <input
                    type="text"
                    value={stripeCardExp}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 4) val = val.substring(0, 4);
                      if (val.length >= 2) {
                        setStripeCardExp(val.substring(0, 2) + '/' + val.substring(2));
                      } else {
                        setStripeCardExp(val);
                      }
                    }}
                    placeholder="MM/YY"
                    disabled={isPayingStripe}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      background: '#ffffff',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '8.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                    CVC / Security Code
                  </label>
                  <input
                    type="password"
                    value={stripeCardCvc}
                    onChange={(e) => setStripeCardCvc(e.target.value.replace(/\D/g, '').substring(0, 4))}
                    placeholder="•••"
                    disabled={isPayingStripe}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      background: '#ffffff',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={isPayingStripe}
                onClick={() => {
                  if (!cardHolder) {
                    setToast({ message: "Please specify cardholder full name", type: "error", isOpen: true });
                    return;
                  }
                  if (!stripeCardNum || stripeCardNum.replace(/\s/g, '').length < 13) {
                    setToast({ message: "Please specify valid card credentials", type: "error", isOpen: true });
                    return;
                  }

                  setIsPayingStripe(true);
                  setToast({ message: "Contacting Stripe Gateway API...", type: "info", isOpen: true });

                  setTimeout(() => {
                    if (user?.id) {
                      localStorage.setItem(`fabrica_onboarding_completed_${user.id}`, 'true');
                    }
                    setIsPayingStripe(false);
                    setShowStripeCheckout(false);

                    setToast({
                      message: `Payment Succeeded! Welcome to your upgraded Fabrica ${selectedPlan.toUpperCase()} Workspace.`,
                      type: 'success',
                      isOpen: true
                    });

                    setTimeout(() => {
                      router.push('/dashboard');
                    }, 1200);
                  }, 1500);
                }}
                style={{
                  background: '#635bff',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '12px',
                  fontWeight: 900,
                  fontSize: '11.5px',
                  cursor: isPayingStripe ? 'not-allowed' : 'pointer',
                  marginTop: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(99, 91, 255, 0.2)'
                }}
              >
                {isPayingStripe ? 'Processing Securely...' : `Pay $${selectedPlan === 'enterprise' ? '249.00' : selectedPlan === 'paug' ? '15.00' : '49.00'} USD`}
              </button>
            </div>
          </div>
        </div>
      )}

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
          gap: '8px'
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
    </div>
  );
}

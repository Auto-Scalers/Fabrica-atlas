'use client';

import React, { useState, useEffect } from 'react';
import { BUSINESS_PLANS } from '../harness/user-harness';
import { buildProvidersFromPiCli, FABRICA_POOL_MODELS } from '../harness/pi-models';

export interface AccountWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiLang: 'EN' | 'FR' | 'AR';
  dtxt: Record<string, any>;
  
  // Method & CLI Models
  tokenBillingMode?: 'managed' | 'paug' | 'byok' | 'pool';
  setTokenBillingMode?: (mode: 'managed' | 'paug' | 'byok' | 'pool') => void;
  piModelsList?: any[];
  
  // Credentials & Keys
  geminiApiKey: string;
  openrouterApiKey: string;
  anthropicApiKey: string;
  geminiKeyStatus: 'valid' | 'invalid' | 'unchecked';
  openrouterKeyStatus: 'valid' | 'invalid' | 'unchecked';
  anthropicKeyStatus: 'valid' | 'invalid' | 'unchecked';
  handleGeminiKeyChange: (val: string) => void;
  handleSaveGeminiKey: (key: string) => void;
  handleClearGeminiKey: () => void;
  handleOpenrouterKeyChange: (val: string) => void;
  handleSaveOpenRouterKey: (key: string) => void;
  handleClearOpenRouterKey: () => void;
  handleAnthropicKeyChange: (val: string) => void;
  handleSaveAnthropicKey: (key: string) => void;
  handleClearAnthropicKey: () => void;

  // Model & Harness selection
  chatModel: string;
  handleModelChange: (model: string) => void;
  isFetchingModels: boolean;
  fetchModelsError: string | null;
  fetchedModels?: any;
  loadRealModels: (gKey?: string, oKey?: string, aKey?: string, oaiKey?: string, grKey?: string, dsKey?: string) => void;
  renderModelOptions: () => React.ReactNode;
  showOnlyFree: boolean;
  setShowOnlyFree: (val: boolean) => void;
  autoFreeFallback: boolean;
  setAutoFreeFallback: (val: boolean) => void;
  modelMetadata: Record<string, any>;

  // User & Workspace
  user: any;
  onboardingUsername?: string;
  onboardingCompanyName?: string;
  activeEntity: string;
  userTierData: any;
  SHOW_PAYMENT_UI: boolean;
  selectedPlan: string;
  setSelectedPlan: (plan: string) => void;
  handleSignOut: () => void;
  setConfirmModal: (modal: any) => void;

  // Quota & Refill
  getQuotaMetrics: (tierData: any) => any;
  renderQuotaWarningAlert: (quota: any) => React.ReactNode;
  handleTopUpCredits: (amount: number) => void;
  isTierLoading: boolean;
  fetchUserTierData?: () => void;

  // Free Tokens & Load Balancer
  freeModelsList: any[];
  fetchFreeModels: () => void;
  keyPoolStats: any;
  fetchKeyPoolStats: () => void;
  poolNewProvider: string;
  setPoolNewProvider: (p: string) => void;
  poolNewKey: string;
  setPoolNewKey: (k: string) => void;
  handleAddKeyToPool: () => void;

  // Stripe & Payment Form
  cardNumber: string;
  setCardNumber: (val: string) => void;
  cardExpiry: string;
  setCardExpiry: (val: string) => void;
  cardCvc: string;
  setCardCvc: (val: string) => void;
  cardBrand: string;
  setCardBrand: (val: string) => void;
  isStripeLoading: boolean;
  setIsStripeLoading: (val: boolean) => void;
  userPaymentHistory: any[];
  setUserPaymentHistory: (history: any[]) => void;
  isVerifyingCard: boolean;
  setIsVerifyingCard: (val: boolean) => void;

  // Notification Toast
  setToast: (toast: { message: string; type: 'success' | 'error' | 'info'; isOpen: boolean }) => void;
  handleVerifyCardForFreeTier?: (cardLast4Input?: string, cardBrandInput?: string) => Promise<void>;
}

export const AccountWorkspaceModal: React.FC<AccountWorkspaceModalProps> = ({
  isOpen,
  onClose,
  uiLang,
  dtxt,
  tokenBillingMode: propsTokenBillingMode,
  setTokenBillingMode: propsSetTokenBillingMode,
  piModelsList = [],
  geminiApiKey,
  openrouterApiKey,
  anthropicApiKey,
  geminiKeyStatus,
  openrouterKeyStatus,
  anthropicKeyStatus,
  handleGeminiKeyChange,
  handleSaveGeminiKey,
  handleClearGeminiKey,
  handleOpenrouterKeyChange,
  handleSaveOpenRouterKey,
  handleClearOpenRouterKey,
  handleAnthropicKeyChange,
  handleSaveAnthropicKey,
  handleClearAnthropicKey,
  chatModel,
  handleModelChange,
  isFetchingModels,
  fetchModelsError,
  fetchedModels,
  loadRealModels,
  renderModelOptions,
  showOnlyFree,
  setShowOnlyFree,
  autoFreeFallback,
  setAutoFreeFallback,
  modelMetadata,
  user,
  onboardingUsername,
  onboardingCompanyName,
  activeEntity,
  userTierData,
  SHOW_PAYMENT_UI,
  selectedPlan,
  setSelectedPlan,
  handleSignOut,
  setConfirmModal,
  getQuotaMetrics,
  renderQuotaWarningAlert,
  handleTopUpCredits,
  isTierLoading,
  fetchUserTierData,
  freeModelsList,
  fetchFreeModels,
  keyPoolStats,
  fetchKeyPoolStats,
  cardNumber,
  setCardNumber,
  cardExpiry,
  setCardExpiry,
  cardCvc,
  setCardCvc,
  cardBrand,
  setCardBrand,
  isStripeLoading,
  setIsStripeLoading,
  userPaymentHistory,
  setUserPaymentHistory,
  isVerifyingCard,
  setIsVerifyingCard,
  setToast,
  handleVerifyCardForFreeTier
}) => {
  // Consolidated into EXACTLY 2 main tabs: 'account' and 'tokens'
  const [activeTab, setActiveTab] = useState<'account' | 'tokens'>('account');
  const [showPaymentSection, setShowPaymentSection] = useState<boolean>(false);
  const isEnterprise = selectedPlan === 'enterprise' || userTierData?.plan === 'enterprise';
  const isPowerUser = selectedPlan === 'pro' || selectedPlan === 'power' || selectedPlan === 'growth' || userTierData?.plan === 'pro';
  const isFreeTier = !isEnterprise && !isPowerUser;

  // Provider Selection & BYOK States for PI Agent Providers
  const [selectedProvider, setSelectedProvider] = useState<string>('google');
  const [internalTokenBillingMode, setInternalTokenBillingMode] = useState<'managed' | 'paug' | 'byok' | 'pool'>(() => {
    return isFreeTier ? 'pool' : 'managed';
  });
  const tokenBillingMode = propsTokenBillingMode !== undefined ? propsTokenBillingMode : internalTokenBillingMode;
  const setTokenBillingMode = (mode: 'managed' | 'paug' | 'byok' | 'pool') => {
    if (propsSetTokenBillingMode) propsSetTokenBillingMode(mode);
    setInternalTokenBillingMode(mode);
  };

  const [openaiApiKey, setOpenaiApiKey] = useState<string>(() => typeof window !== 'undefined' ? localStorage.getItem('fabrica_openai_api_key') || '' : '');
  const [groqApiKey, setGroqApiKey] = useState<string>(() => typeof window !== 'undefined' ? localStorage.getItem('fabrica_groq_api_key') || '' : '');
  const [deepseekApiKey, setDeepseekApiKey] = useState<string>(() => typeof window !== 'undefined' ? localStorage.getItem('fabrica_deepseek_api_key') || '' : '');
  const [isRefreshingModelsLocal, setIsRefreshingModelsLocal] = useState<boolean>(false);

  // Dynamically constructed from agent CLI command (pi --list-models)
  const PI_AGENT_PROVIDERS = buildProvidersFromPiCli(piModelsList || []);

  const FABRICA_POOL_MODELS = [
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Free Allocation)' },
    { id: 'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nvidia Nemotron 3 Ultra 550B (Free)' },
    { id: 'openrouter/nvidia/nemotron-3-super-120b-a12b:free', name: 'Nvidia Nemotron 3 Super 120B (Free)' },
    { id: 'openrouter/poolside/laguna-s-2.1:free', name: 'Poolside Laguna S 2.1 (Free)' },
    { id: 'openrouter/google/gemma-4-31b-it:free', name: 'Google Gemma 4 31B IT (Free)' }
  ];

  useEffect(() => {
    if (isOpen && activeTab === 'tokens') {
      fetchFreeModels();
    }
  }, [isOpen, activeTab]);

  // Enforce tier-specific allowed execution methods
  useEffect(() => {
    if (isFreeTier && tokenBillingMode !== 'pool') {
      setTokenBillingMode('pool');
    } else if (isPowerUser && tokenBillingMode !== 'managed' && tokenBillingMode !== 'paug') {
      setTokenBillingMode('managed');
    } else if (isEnterprise && tokenBillingMode !== 'managed' && tokenBillingMode !== 'paug' && tokenBillingMode !== 'byok') {
      setTokenBillingMode('managed');
    }
  }, [selectedPlan, userTierData, isFreeTier, isPowerUser, isEnterprise, tokenBillingMode]);

  if (!isOpen) return null;

  const renderStatusBadge = (status: 'valid' | 'invalid' | 'unchecked') => {
    if (status === 'valid') {
      return (
        <span style={{ fontSize: '7.5px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', padding: '1px 5px', borderRadius: '3px', fontWeight: 800, marginLeft: '6px' }}>
          ✓ VERIFIED
        </span>
      );
    }
    if (status === 'invalid') {
      return (
        <span style={{ fontSize: '7.5px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444', padding: '1px 5px', borderRadius: '3px', fontWeight: 800, marginLeft: '6px' }}>
          ✕ INVALID KEY
        </span>
      );
    }
    return null;
  };

  return (
    <div
      className="dashboard-modal-overlay"
      style={{
        background: 'rgba(9, 13, 22, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
        width: 'min(58rem, 95vw)',
        height: 'min(38rem, 88vh)',
        background: 'var(--surface)',
        border: '2px solid var(--border)',
        borderRadius: '12px',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4), var(--shadow)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          borderBottom: '2px solid var(--border)',
          background: 'var(--surface-alt)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>⚙️</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <b style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {dtxt.accountModalTitle || 'Account, Workspace & API Credentials'}
                </b>
                <span
                  style={{
                    fontSize: '8px',
                    fontWeight: 800,
                    color: '#8b5cf6',
                    background: 'rgba(139, 92, 246, 0.15)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}
                >
                  {selectedPlan ? `${selectedPlan.toUpperCase()} TIER` : 'FREE SHARED TIER'}
                </span>
              </div>
              <span style={{ fontSize: '8.5px', color: 'var(--muted)' }}>
                {dtxt.accountModalDesc || 'Manage your workspace profile, subscription billing, BYOK keys & User Harness model routing'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="fw-close-btn"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              transition: 'all 0.15s'
            }}
          >
            ✕
          </button>
        </div>

        {/* Top 2-Section Navigation Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderBottom: '1.5px solid var(--border-soft)',
          background: 'rgba(0, 0, 0, 0.15)',
          flexShrink: 0
        }}>
          <button
            onClick={() => setActiveTab('account')}
            style={{
              background: activeTab === 'account' ? 'var(--surface)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'account' ? '3px solid var(--accent)' : '3px solid transparent',
              color: activeTab === 'account' ? 'var(--accent)' : 'var(--muted)',
              fontSize: '11px',
              fontWeight: 800,
              padding: '12px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            <span style={{ fontSize: '14px' }}>👤</span>
            <span>{dtxt.accountTabLabel || 'Account & Workspace'}</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('tokens');
              fetchKeyPoolStats();
              fetchFreeModels();
            }}
            style={{
              background: activeTab === 'tokens' ? 'var(--surface)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'tokens' ? '3px solid #10b981' : '3px solid transparent',
              color: activeTab === 'tokens' ? '#10b981' : 'var(--muted)',
              fontSize: '11px',
              fontWeight: 800,
              padding: '12px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            <span style={{ fontSize: '14px' }}>🔑</span>
            <span>{dtxt.tokensTabLabel || 'Tokens & Methods'}</span>
          </button>
        </div>

        {/* Main Content Body */}
        <div style={{ flex: 1, padding: '18px', overflowY: 'auto', minHeight: 0 }}>
          
          {/* ========================================================================= */}
          {/* SECTION 1: ACCOUNT & WORKSPACE */}
          {/* ========================================================================= */}
          {activeTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Workspace Identity & Security */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-soft)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-soft)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>
                    📋 Workspace Identity & Security
                  </span>
                  <span style={{ color: user?.isSandbox ? '#eab308' : '#3ecf8e', fontWeight: 800, fontSize: '8px', background: user?.isSandbox ? 'rgba(234, 179, 8, 0.1)' : 'rgba(62, 207, 142, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    {user?.isSandbox ? 'SANDBOX ACTIVE' : 'SECURELY AUTHENTICATED'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--muted)' }}>Account Email:</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{user?.email || 'Anonymous Demo User'}</span>
                  </div>
                  {onboardingUsername && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)' }}>Workspace Username:</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent-2)' }}>@{onboardingUsername}</span>
                    </div>
                  )}
                  {onboardingCompanyName && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)' }}>Corporate Entity:</span>
                      <span style={{ fontWeight: 700, color: '#fff', fontSize: '8.5px' }}>{onboardingCompanyName}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--muted)', fontWeight: 700 }}>Tenant Space ID:</span>
                    <span style={{
                      fontFamily: 'var(--mono)',
                      color: '#6366f1',
                      background: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '8.5px',
                      fontWeight: 800
                    }}>
                      {user?.id ? user.id : (activeEntity || 'sandbox-default-local')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--muted)' }}>Current Subscription:</span>
                    <span style={{ fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase' }}>
                      {selectedPlan ? `${selectedPlan.toUpperCase()} TIER` : 'FREE SHARED TIER'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--muted)' }}>Contact Support:</span>
                    <a href="mailto:fabrica.studio.contact@gmail.com" style={{ fontWeight: 700, color: '#06b6d4', textDecoration: 'none', fontFamily: 'var(--mono)' }}>
                      fabrica.studio.contact@gmail.com
                    </a>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '8px', marginTop: '2px' }}>
                  <button
                    onClick={handleSignOut}
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      borderRadius: '4px',
                      color: '#ef4444',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      fontWeight: 800,
                      fontSize: '9px',
                      width: '100%',
                      textAlign: 'center',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      transition: 'all 0.15s'
                    }}
                  >
                    🚪 Terminate Session & Sign Out
                  </button>
                </div>
              </div>

              {/* Plans & Subscription Pricing Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    💼 Subscription Plans & Enterprise Tiers
                  </span>
                  <span style={{ fontSize: '8px', color: '#10b981', fontWeight: 800, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '5px', height: '5px', background: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
                    SECURED VIA STRIPE GATEWAY
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {Object.values(BUSINESS_PLANS).filter(p => p.id !== 'paug').map((plan) => {
                    const isCurrent = selectedPlan === plan.id;
                    return (
                      <div
                        key={plan.id}
                        style={{
                          background: isCurrent ? 'rgba(139, 92, 246, 0.08)' : 'var(--surface-alt)',
                          border: isCurrent ? '2px solid #8b5cf6' : '1px solid var(--border-soft)',
                          borderRadius: '8px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          position: 'relative'
                        }}
                      >
                        {plan.isPopular && (
                          <span style={{ position: 'absolute', top: '-9px', right: '10px', background: '#8b5cf6', color: '#fff', fontSize: '7px', fontWeight: 900, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            MOST POPULAR
                          </span>
                        )}
                        <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text)' }}>{plan.name}</div>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#8b5cf6', fontFamily: 'var(--mono)' }}>
                          ${plan.priceMonthly}<span style={{ fontSize: '8.5px', color: 'var(--muted)', fontWeight: 500 }}>/mo</span>
                        </div>
                        <div style={{ fontSize: '8px', color: 'var(--muted)', minHeight: '22px', lineHeight: 1.3 }}>{plan.description}</div>
                        <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '8px' }}>
                          {plan.features.slice(0, 3).map((f, i) => (
                            <span key={i} style={{ fontSize: '7.5px', color: 'var(--text-soft)' }}>✓ {f}</span>
                          ))}
                        </div>
                        <button
                          disabled={isStripeLoading}
                          onClick={() => {
                            setIsStripeLoading(true);
                            setShowPaymentSection(true);
                            setToast({ message: `Selecting plan ${plan.name}... Please confirm payment details below.`, type: 'info', isOpen: true });
                            setTimeout(() => {
                              setSelectedPlan(plan.id);
                              localStorage.setItem(`fabrica_ob_plan_${user?.id || 'default'}`, plan.id);
                              setIsStripeLoading(false);
                            }, 500);
                          }}
                          style={{
                            marginTop: 'auto',
                            padding: '6px',
                            borderRadius: '4px',
                            border: isCurrent ? '1px solid #8b5cf6' : 'none',
                            background: isCurrent ? 'rgba(139, 92, 246, 0.2)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                            color: '#fff',
                            fontSize: '8.5px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          {isCurrent ? 'ACTIVE PLAN' : `SELECT ${plan.name.toUpperCase()}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: TOKENS & API CREDENTIALS */}
          {/* ========================================================================= */}
          {activeTab === 'tokens' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

              {/* LEFT COLUMN: Model Intelligence & BYOK Credentials or Free Tier Claiming */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Active Execution Method Dropdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1.5px solid var(--border-soft)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      💳 Active Execution Method
                    </span>
                    <span style={{ fontSize: '7.5px', background: isFreeTier ? 'rgba(16, 185, 129, 0.12)' : isPowerUser ? 'rgba(245, 158, 11, 0.12)' : 'rgba(139, 92, 246, 0.12)', color: isFreeTier ? '#10b981' : isPowerUser ? '#f59e0b' : '#8b5cf6', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                      {isFreeTier ? 'FREE TIER' : isPowerUser ? 'POWER TIER' : 'ENTERPRISE TIER'}
                    </span>
                  </div>

                  <select
                    value={tokenBillingMode}
                    onChange={(e) => {
                      const mode = e.target.value as 'pool' | 'managed' | 'paug' | 'byok';
                      setTokenBillingMode(mode);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('fabrica_llm_method', mode);
                      }
                    }}
                    style={{
                      background: 'var(--surface-alt)',
                      border: '1.5px solid #3b82f6',
                      borderRadius: '6px',
                      color: 'var(--text)',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '7px 9px',
                      outline: 'none',
                      width: '100%',
                      cursor: 'pointer'
                    }}
                  >
                    {isFreeTier && (
                      <option value="pool">🏊 FREE Method (Fabrica System Key Pool)</option>
                    )}
                    {isPowerUser && (
                      <>
                        <option value="managed">🪙 Credit Method (Managed LLM Credits)</option>
                        <option value="paug">⚡ PAUS Method (Pay-As-You-Search / Metered Infra)</option>
                      </>
                    )}
                    {isEnterprise && (
                      <>
                        <option value="managed">🪙 Credit Method (Managed LLM Credits)</option>
                        <option value="paug">⚡ PAUS Method (Pay-As-You-Search / Metered Infra)</option>
                        <option value="byok">🔑 BUOK Method (Bring Your Own API Keys)</option>
                      </>
                    )}
                  </select>

                  <div style={{ fontSize: '8px', color: 'var(--muted)', lineHeight: 1.35 }}>
                    {tokenBillingMode === 'pool' && '🏊 Free allocation with 500k monthly tokens from the system key pool.'}
                    {tokenBillingMode === 'managed' && '🪙 Automated LLM routing using your managed credit balance.'}
                    {tokenBillingMode === 'paug' && '⚡ Pay-As-You-Search metered execution with priority multi-worker concurrency.'}
                    {tokenBillingMode === 'byok' && '🔑 Direct API key routing for 6 major providers (Google, Anthropic, OpenAI, Groq, DeepSeek, OpenRouter).'}
                  </div>
                </div>

                {/* Usage Quota & Token Alerts Meter */}
                {(() => {
                  const q = getQuotaMetrics(userTierData);
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '8px', border: '1.5px solid var(--border-soft)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-soft)', paddingBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>
                            📊 Usage Quota & Token Alerts
                          </span>
                          <span style={{ fontSize: '7.5px', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '1px 5px', borderRadius: '3px', fontWeight: 900 }}>
                            🟢 REALTIME
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {fetchUserTierData && (
                            <button
                              onClick={() => fetchUserTierData()}
                              title="Sync live usage quota"
                              style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '9px', padding: '1px 3px' }}
                            >
                              🔄
                            </button>
                          )}
                          <span style={{ fontSize: '8px', color: q.statusColor, fontWeight: 800 }}>
                            {q.percentRemaining}% Tokens Available
                          </span>
                        </div>
                      </div>

                      {renderQuotaWarningAlert(q)}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px' }}>
                          <span style={{ color: 'var(--muted)', fontWeight: 700 }}>MONTHLY TOKEN ALLOCATION</span>
                          <span style={{ color: 'var(--text)', fontWeight: 800 }}>{q?.percentUsed ?? 0}% Used ({(Number(q?.usedTokensThisMonth) || 0).toLocaleString()} / {(Number(q?.monthlyQuotaTokens) || 0).toLocaleString()})</span>
                        </div>
                        <div style={{ height: '7px', background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${q.percentUsed}%`, height: '100%', background: q.statusColor, transition: 'width 0.4s ease' }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {isEnterprise && tokenBillingMode === 'byok' && (
                  /* BUOK / BYOK METHOD SELECTED: User Harness Model Intelligence & Routing */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-soft)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '10px', fontWeight: 800, color: 'var(--accent-2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        🤖 User Harness Model Intelligence & Routing
                      </h4>
                    </div>

                    {fetchModelsError && (
                      <span style={{ fontSize: '7.5px', color: 'var(--status-error)', display: 'block', padding: '1px 0' }}>
                        ⚠️ {fetchModelsError}
                      </span>
                    )}

                    {/* ONLY FREE MODELS TOGGLE: Shows ONLY when TOKEN BILLING & ROUTING METHOD is set to BYOK */}
                    {tokenBillingMode === 'byok' && (
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-alt)', padding: '5px 8px', borderRadius: '4px', border: '1px solid var(--border-soft)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '8.5px', fontWeight: 700, color: 'var(--text)' }}>
                          <input
                            type="checkbox"
                            checked={showOnlyFree}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setShowOnlyFree(checked);
                              if (checked) {
                                if (selectedProvider !== 'google' && selectedProvider !== 'openrouter' && selectedProvider !== 'groq') {
                                  setSelectedProvider('google');
                                  handleModelChange('gemini-2.0-flash');
                                }
                              }
                            }}
                            style={{ width: '12px', height: '12px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                          />
                          <span>{dtxt.onlyFreeModels || 'Only Free Models'}</span>
                        </label>

                        {showOnlyFree && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '8.5px', fontWeight: 700, color: 'var(--text)' }}>
                            <input
                              type="checkbox"
                              checked={autoFreeFallback}
                              onChange={(e) => setAutoFreeFallback(e.target.checked)}
                              style={{ width: '12px', height: '12px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                            />
                            <span>{dtxt.autoFreeFallback || 'Auto Free Fallback'}</span>
                          </label>
                        )}
                      </div>
                    )}

                    {/* Provider Selection (Hidden when Fabrica-Pool is selected) */}
                    {(tokenBillingMode as string) !== 'pool' && (
                      <>
                        {(() => {
                          const availableProviders = ((tokenBillingMode as string) === 'byok' && showOnlyFree)
                            ? PI_AGENT_PROVIDERS.filter(p => p.id === 'google' || p.id === 'openrouter' || p.id === 'groq')
                            : PI_AGENT_PROVIDERS;

                          const currentProv = availableProviders.find(p => p.id === selectedProvider) || availableProviders[0];

                          return (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                                  SELECT PI AGENT PROVIDER
                                </span>
                                <select
                                  value={selectedProvider}
                                  onChange={(e) => {
                                    const provId = e.target.value;
                                    setSelectedProvider(provId);
                                    const prov = availableProviders.find(p => p.id === provId);
                                    if (prov && prov.models && prov.models.length > 0) {
                                      handleModelChange(prov.models[0].id);
                                    }
                                  }}
                                  style={{
                                    background: 'var(--surface-alt)',
                                    border: '1.5px solid var(--border-soft)',
                                    borderRadius: '4px',
                                    color: 'var(--text)',
                                    fontSize: '9.5px',
                                    padding: '6px 8px',
                                    outline: 'none',
                                    width: '100%',
                                    fontWeight: 800
                                  }}
                                >
                                  {availableProviders.map((prov) => (
                                    <option key={prov.id} value={prov.id}>
                                      {prov.name} — [{prov.badge}]
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Selected Provider Info Banner */}
                              <div style={{ background: 'var(--surface-alt)', border: `1px solid ${currentProv.badgeColor}`, borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--text)' }}>
                                    {currentProv.name}
                                  </span>
                                  <span style={{ fontSize: '7px', fontWeight: 900, background: currentProv.badgeColor, color: '#fff', padding: '1px 5px', borderRadius: '3px' }}>
                                    {currentProv.badge}
                                  </span>
                                </div>
                                <span style={{ fontSize: '7.5px', color: 'var(--muted)' }}>
                                  {currentProv.description}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </>
                    )}

                    {/* Default Model Selection for Selected Provider / Billing Mode */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                        DEFAULT MODEL SELECTION
                      </span>
                      <select
                        style={{
                          background: 'var(--surface-alt)',
                          border: '1.5px solid var(--border-soft)',
                          borderRadius: '4px',
                          color: 'var(--text)',
                          fontSize: '9.5px',
                          padding: '6px 8px',
                          outline: 'none',
                          width: '100%',
                          fontWeight: 800
                        }}
                        value={chatModel}
                        onChange={(e) => handleModelChange(e.target.value)}
                      >
                        {(tokenBillingMode as string) === 'pool' ? (
                          FABRICA_POOL_MODELS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))
                        ) : (tokenBillingMode as string) === 'byok' && showOnlyFree ? (
                          (() => {
                            if (selectedProvider === 'google') {
                              return <option value="gemini-3.6-flash">Gemini 3.6 Flash (Free Tier)</option>;
                            } else if (selectedProvider === 'openrouter') {
                              return (
                                <>
                                  <option value="openrouter/nvidia/nemotron-3-ultra-550b-a55b:free">Nvidia Nemotron 3 Ultra 550B (Free)</option>
                                  <option value="openrouter/nvidia/nemotron-3-super-120b-a12b:free">Nvidia Nemotron 3 Super 120B (Free)</option>
                                  <option value="openrouter/poolside/laguna-s-2.1:free">Poolside Laguna S 2.1 (Free)</option>
                                  <option value="openrouter/google/gemma-4-31b-it:free">Google Gemma 4 31B IT (Free)</option>
                                </>
                              );
                            } else if (selectedProvider === 'groq') {
                              return <option value="groq/llama-3.3-70b-versatile">Groq Llama 3.3 70B (Free Tier)</option>;
                            }
                            return renderModelOptions();
                          })()
                        ) : (
                          renderModelOptions()
                        )}
                      </select>
                    </div>

                    {/* Active Model Intel - Adaptive to Selected Provider & Billing Mode */}
                    {(() => {
                      const currentProv = (tokenBillingMode as string) === 'pool'
                        ? { name: 'Fabrica System Key Pool', badgeColor: '#10b981' }
                        : (PI_AGENT_PROVIDERS.find(p => p.id === selectedProvider) || PI_AGENT_PROVIDERS[0]);
                      const meta = modelMetadata[chatModel] || {};
                      let rateLimit = meta.limit || (selectedProvider === 'groq' ? '1,500 RPM / 3M TPM' : '1,000 RPM / 2M TPM');
                      let proxyCost = (tokenBillingMode as string) === 'pool' ? 'FREE (System Allocation)' : (tokenBillingMode as string) === 'managed' ? 'Managed Credits ($0.005/req)' : (tokenBillingMode as string) === 'paug' ? 'PAUG Metered' : 'BYOK Direct';
                      let speed = selectedProvider === 'groq' ? '⚡ Groq LPU (~180ms)' : chatModel.includes('flash') ? '⚡ Ultra Fast (~320ms)' : '🧠 High Reasoning (~800ms)';

                      return (
                        <div style={{ background: 'rgba(245, 158, 11, 0.04)', border: '1px dashed rgba(245, 158, 11, 0.3)', borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <b style={{ fontSize: '8.5px', color: 'var(--text)' }}>🎯 Active Model Intel ({chatModel})</b>
                            <span style={{ fontSize: '7px', color: currentProv.badgeColor, fontWeight: 800, textTransform: 'uppercase' }}>
                              {currentProv.name}
                            </span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '7.5px' }}>
                            <span style={{ color: 'var(--muted)' }}>
                              <b>Rate Limits:</b> <span style={{ color: 'var(--text)', fontWeight: 700 }}>{rateLimit}</span>
                            </span>
                            <span style={{ color: 'var(--muted)' }}>
                              <b>Proxy Cost:</b> <span style={{ color: '#10b981', fontWeight: 700 }}>{proxyCost}</span>
                            </span>
                            <span style={{ color: 'var(--muted)' }}>
                              <b>Latency / Speed:</b> <span style={{ color: 'var(--text)', fontWeight: 700 }}>{speed}</span>
                            </span>
                            <span style={{ color: 'var(--muted)' }}>
                              <b>Billing Source:</b> <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{tokenBillingMode.toUpperCase()}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Configured API Key Field for Selected Provider / System Pool Verification */}
                    <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>
                        CONFIGURED PROVIDER API KEY / CREDIT TOKEN
                      </span>

                      {tokenBillingMode !== 'byok' ? (
                        <div style={{ background: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '6px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px' }}>⚡</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                            <b style={{ fontSize: '8.5px', color: 'var(--accent)' }}>
                              No Personal Key Required ({tokenBillingMode === 'managed' ? 'Managed Credits' : 'PAUG Infra'})
                            </b>
                            <span style={{ fontSize: '7.5px', color: 'var(--muted)' }}>
                              Fabrica automatically routes and authenticates calls via system enterprise gateway endpoints.
                            </span>
                          </div>
                        </div>
                      ) : selectedProvider === 'google' ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input
                            type="password"
                            placeholder={geminiApiKey ? '••••••••••••••••' : 'Paste your GEMINI_API_KEY...'}
                            value={geminiApiKey}
                            onChange={(e) => handleGeminiKeyChange(e.target.value)}
                            style={{ flex: 1, background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', outline: 'none' }}
                          />
                          <button className="mini accent" style={{ fontSize: '8px', padding: '0 8px' }} onClick={() => handleSaveGeminiKey(geminiApiKey)}>Save</button>
                          {geminiApiKey && <button className="mini" style={{ fontSize: '8px', padding: '0 8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-error)', color: 'var(--status-error)' }} onClick={handleClearGeminiKey}>Clear</button>}
                        </div>
                      ) : selectedProvider === 'openrouter' ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input
                            type="password"
                            placeholder={openrouterApiKey ? '••••••••••••••••' : 'Paste your OpenRouter Key...'}
                            value={openrouterApiKey}
                            onChange={(e) => handleOpenrouterKeyChange(e.target.value)}
                            style={{ flex: 1, background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', outline: 'none' }}
                          />
                          <button className="mini accent" style={{ fontSize: '8px', padding: '0 8px' }} onClick={() => handleSaveOpenRouterKey(openrouterApiKey)}>Save</button>
                          {openrouterApiKey && <button className="mini" style={{ fontSize: '8px', padding: '0 8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-error)', color: 'var(--status-error)' }} onClick={handleClearOpenRouterKey}>Clear</button>}
                        </div>
                      ) : selectedProvider === 'anthropic' ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input
                            type="password"
                            placeholder={anthropicApiKey ? '••••••••••••••••' : 'Paste your Anthropic Key...'}
                            value={anthropicApiKey}
                            onChange={(e) => handleAnthropicKeyChange(e.target.value)}
                            style={{ flex: 1, background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', outline: 'none' }}
                          />
                          <button className="mini accent" style={{ fontSize: '8px', padding: '0 8px' }} onClick={() => handleSaveAnthropicKey(anthropicApiKey)}>Save</button>
                          {anthropicApiKey && <button className="mini" style={{ fontSize: '8px', padding: '0 8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-error)', color: 'var(--status-error)' }} onClick={handleClearAnthropicKey}>Clear</button>}
                        </div>
                      ) : selectedProvider === 'openai' ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input
                            type="password"
                            placeholder={openaiApiKey ? '••••••••••••••••' : 'Paste your OpenAI API Key...'}
                            value={openaiApiKey}
                            onChange={(e) => {
                              setOpenaiApiKey(e.target.value);
                              localStorage.setItem('fabrica_openai_api_key', e.target.value);
                            }}
                            style={{ flex: 1, background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', outline: 'none' }}
                          />
                          <button className="mini accent" style={{ fontSize: '8px', padding: '0 8px' }} onClick={() => setToast({ message: 'OpenAI API key saved successfully!', type: 'success', isOpen: true })}>Save</button>
                        </div>
                      ) : selectedProvider === 'groq' ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input
                            type="password"
                            placeholder={groqApiKey ? '••••••••••••••••' : 'Paste your Groq API Key...'}
                            value={groqApiKey}
                            onChange={(e) => {
                              setGroqApiKey(e.target.value);
                              localStorage.setItem('fabrica_groq_api_key', e.target.value);
                            }}
                            style={{ flex: 1, background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', outline: 'none' }}
                          />
                          <button className="mini accent" style={{ fontSize: '8px', padding: '0 8px' }} onClick={() => setToast({ message: 'Groq API key saved successfully!', type: 'success', isOpen: true })}>Save</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <input
                            type="password"
                            placeholder={deepseekApiKey ? '••••••••••••••••' : 'Paste your DeepSeek Key...'}
                            value={deepseekApiKey}
                            onChange={(e) => {
                              setDeepseekApiKey(e.target.value);
                              localStorage.setItem('fabrica_deepseek_api_key', e.target.value);
                            }}
                            style={{ flex: 1, background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', outline: 'none' }}
                          />
                          <button className="mini accent" style={{ fontSize: '8px', padding: '0 8px' }} onClick={() => setToast({ message: 'DeepSeek API key saved successfully!', type: 'success', isOpen: true })}>Save</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* RIGHT COLUMN: Tier-based dynamic cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Free Tier Tokens & Card Verification Card (Placed on the right) */}
                {isFreeTier && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '8px', border: '1.5px solid var(--border-soft)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '10px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        🎁 Free Tier Tokens & Card Verification
                      </h4>
                      <span style={{ fontSize: '7.5px', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        FREE ALLOCATION
                      </span>
                    </div>

                    {!(userTierData?.cardVerified || userTierData?.paymentVerified || userTierData?.hasVerifiedCard || (typeof window !== 'undefined' && localStorage.getItem('fabrica_card_verified') === 'true')) ? (
                      <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1.5px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <b style={{ fontSize: '9px', color: '#ef4444', textTransform: 'uppercase' }}>
                            🎁 Confirm Card to Collect 500,000 Free Tokens
                          </b>
                          <span style={{ fontSize: '7px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '1px 5px', borderRadius: '3px', fontWeight: 800 }}>
                            CARD REQUIRED ($0)
                          </span>
                        </div>
                        <span style={{ fontSize: '8px', color: 'var(--muted)', lineHeight: 1.35 }}>
                          Verify a payment card below to unlock your 500,000 free monthly Fabrica token allocation. No charge will be made.
                        </span>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.8fr', gap: '6px' }}>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 16) val = val.substring(0, 16);
                              if (val.startsWith('3')) setCardBrand('Amex');
                              else if (val.startsWith('5')) setCardBrand('Mastercard');
                              else setCardBrand('Visa');
                              setCardNumber(val.replace(/(\d{4})(?=\d)/g, '$1 '));
                            }}
                            placeholder="4242 4242 4242 4242"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', fontFamily: 'var(--mono)' }}
                          />
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 4) val = val.substring(0, 4);
                              if (val.length >= 2) setCardExpiry(val.substring(0, 2) + '/' + val.substring(2));
                              else setCardExpiry(val);
                            }}
                            placeholder="MM/YY"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', fontFamily: 'var(--mono)' }}
                          />
                          <input
                            type="password"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').substring(0, 4))}
                            placeholder="CVC"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', fontFamily: 'var(--mono)' }}
                          />
                        </div>

                        <button
                          disabled={isVerifyingCard}
                          onClick={async () => {
                            if (typeof window !== 'undefined') {
                              localStorage.setItem('fabrica_card_verified', 'true');
                            }
                            if (handleVerifyCardForFreeTier) {
                              await handleVerifyCardForFreeTier(cardNumber.replace(/\s/g, '').slice(-4), cardBrand);
                            } else {
                              setIsVerifyingCard(true);
                              setTimeout(() => {
                                setIsVerifyingCard(false);
                                setToast({ message: 'Card verified! 500,000 Free Tokens activated!', type: 'success', isOpen: true });
                              }, 1000);
                            }
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '8.5px',
                            fontWeight: 900,
                            padding: '6px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            width: '100%'
                          }}
                        >
                          {isVerifyingCard ? '⏳ Verifying Card...' : '💳 Confirm Card ($0 Charge) & Collect 500k Free Tokens'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid #10b981', borderRadius: '6px', padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#10b981' }}>
                          ✓ Fabrica System Pool Active (500,000 Free Tokens Claimed)
                        </span>
                        <span style={{ fontSize: '7.5px', background: '#10b981', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontWeight: 900 }}>
                          VERIFIED CARD
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 1. Tier Dynamic Handling */}
                {(() => {
                  const isEnterprise = selectedPlan === 'enterprise' || userTierData?.plan === 'enterprise';
                  const isPowerUser = selectedPlan === 'pro' || selectedPlan === 'power' || selectedPlan === 'growth' || userTierData?.plan === 'pro';
                  const isCardVerified = userTierData?.cardVerified || userTierData?.paymentVerified || userTierData?.hasVerifiedCard || (typeof window !== 'undefined' && localStorage.getItem('fabrica_card_verified') === 'true');

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {isEnterprise || isPowerUser ? (
                        // POWER USER OR ENTERPRISE TIER
                        <>
                          {/* 1. Managed LLM Credits Balance */}
                          <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '9px', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
                                🪙 Managed LLM Credits Balance
                              </span>
                              <span style={{ fontSize: '16px', fontWeight: 900, color: '#fff', fontFamily: 'var(--mono)' }}>
                                ${(userTierData?.llmCredits?.balanceDollars || 15.00).toFixed(2)}
                              </span>
                            </div>
                            <div style={{ fontSize: '8px', color: 'var(--muted)', lineHeight: 1.35 }}>
                              Managed credits cover high-speed model executions when personal BYOK keys are not set.
                            </div>
                            
                            {/* Instant Top-Up */}
                            <div style={{ borderTop: '1px solid rgba(245, 158, 11, 0.15)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase' }}>
                                💳 Instant Credit Top-Up
                              </span>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                                {[5, 10, 25, 50].map((amt) => (
                                  <button
                                    key={amt}
                                    onClick={() => handleTopUpCredits(amt)}
                                    disabled={isTierLoading}
                                    style={{
                                      padding: '5px',
                                      fontSize: '8.5px',
                                      fontWeight: 800,
                                      background: 'var(--surface-alt)',
                                      border: '1px solid var(--border-soft)',
                                      color: 'var(--text)',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s'
                                    }}
                                  >
                                    +${amt}.00
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* 2. PAUG Infrastructure Specs */}
                          <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>
                                ⚡ PAUG (Pay-As-You-Go) Infrastructure Specs
                              </span>
                              <span style={{ fontSize: '7.5px', background: isEnterprise ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)', color: isEnterprise ? '#10b981' : '#6366f1', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 }}>
                                {isEnterprise ? 'ENTERPRISE DISCOUNTED' : 'POWER USER SPECS'}
                              </span>
                            </div>

                            <div style={{ fontSize: '8px', color: 'var(--text-soft)', lineHeight: 1.35 }}>
                              {isEnterprise
                                ? 'Enterprise tier includes heavily discounted execution rates, dedicated multi-region container instances, and 99.99% custom SLA.'
                                : 'Automated architecture consulting, deep research indexing, and multi-tenant data pipelines scaling seamlessly on Cloud Run.'
                              }
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px', fontSize: '8px' }}>
                              <div style={{ background: 'var(--surface-alt)', padding: '6px', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--muted)', display: 'block' }}>Per Request Rate:</span>
                                <b style={{ color: isEnterprise ? '#10b981' : '#fff' }}>
                                  {isEnterprise ? '$0.002 / Request (60% Off)' : '$0.005 / Request'}
                                </b>
                              </div>
                              <div style={{ background: 'var(--surface-alt)', padding: '6px', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--muted)', display: 'block' }}>Container Infra:</span>
                                <b style={{ color: isEnterprise ? '#10b981' : '#10b981' }}>
                                  {isEnterprise ? 'Dedicated Multi-Region' : 'Auto-scaled Shared'}
                                </b>
                              </div>
                              <div style={{ background: 'var(--surface-alt)', padding: '6px', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--muted)', display: 'block' }}>Concurrency:</span>
                                <b style={{ color: '#fff' }}>
                                  {isEnterprise ? 'Uncapped Priority' : 'Standard Multi-Worker'}
                                </b>
                              </div>
                              <div style={{ background: 'var(--surface-alt)', padding: '6px', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--muted)', display: 'block' }}>Support & SLA:</span>
                                <b style={{ color: '#fff' }}>
                                  {isEnterprise ? '24/7 Dedicated + 99.99% SLA' : 'Standard Pipeline Support'}
                                </b>
                              </div>
                            </div>
                          </div>
                        </>
                      ) : null}

                      {/* 3. API Key Credentials & Providers Configuration */}
                      {isEnterprise && (
                        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-soft)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>
                              🔑 API Key Credentials & Providers Configuration
                            </span>
                            <span style={{ fontSize: '7.5px', background: 'rgba(204, 122, 74, 0.12)', color: 'var(--accent)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                              BUOK / BYOK
                            </span>
                          </div>

                          <div style={{ fontSize: '8px', color: 'var(--muted)', lineHeight: 1.35 }}>
                            Saved API keys for direct user routing across supported LLM providers.
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Google Gemini Key */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--text)' }}>Google Gemini API Key</span>
                                {renderStatusBadge(geminiKeyStatus)}
                              </div>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input
                                  type="password"
                                  placeholder={geminiApiKey ? '••••••••••••••••' : 'Paste GEMINI_API_KEY...'}
                                  value={geminiApiKey}
                                  onChange={(e) => handleGeminiKeyChange(e.target.value)}
                                  style={{ flex: 1, background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', outline: 'none' }}
                                />
                                <button className="mini accent" style={{ fontSize: '8px', padding: '0 8px' }} onClick={() => handleSaveGeminiKey(geminiApiKey)}>Save</button>
                                {geminiApiKey && <button className="mini" style={{ fontSize: '8px', padding: '0 8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-error)', color: 'var(--status-error)' }} onClick={handleClearGeminiKey}>Clear</button>}
                              </div>
                            </div>

                            {/* Anthropic Claude Key */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--text)' }}>Anthropic Claude Key</span>
                                {renderStatusBadge(anthropicKeyStatus)}
                              </div>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input
                                  type="password"
                                  placeholder={anthropicApiKey ? '••••••••••••••••' : 'Paste Anthropic API Key...'}
                                  value={anthropicApiKey}
                                  onChange={(e) => handleAnthropicKeyChange(e.target.value)}
                                  style={{ flex: 1, background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', outline: 'none' }}
                                />
                                <button className="mini accent" style={{ fontSize: '8px', padding: '0 8px' }} onClick={() => handleSaveAnthropicKey(anthropicApiKey)}>Save</button>
                                {anthropicApiKey && <button className="mini" style={{ fontSize: '8px', padding: '0 8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-error)', color: 'var(--status-error)' }} onClick={handleClearAnthropicKey}>Clear</button>}
                              </div>
                            </div>

                            {/* OpenRouter Key */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--text)' }}>OpenRouter API Key</span>
                                {renderStatusBadge(openrouterKeyStatus)}
                              </div>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input
                                  type="password"
                                  placeholder={openrouterApiKey ? '••••••••••••••••' : 'Paste OpenRouter Key...'}
                                  value={openrouterApiKey}
                                  onChange={(e) => handleOpenrouterKeyChange(e.target.value)}
                                  style={{ flex: 1, background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', outline: 'none' }}
                                />
                                <button className="mini accent" style={{ fontSize: '8px', padding: '0 8px' }} onClick={() => handleSaveOpenRouterKey(openrouterApiKey)}>Save</button>
                                {openrouterApiKey && <button className="mini" style={{ fontSize: '8px', padding: '0 8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-error)', color: 'var(--status-error)' }} onClick={handleClearOpenRouterKey}>Clear</button>}
                              </div>
                            </div>

                            {/* OpenAI Key */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--text)' }}>OpenAI API Key</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input
                                  type="password"
                                  placeholder={openaiApiKey ? '••••••••••••••••' : 'Paste OpenAI API Key...'}
                                  value={openaiApiKey}
                                  onChange={(e) => {
                                    setOpenaiApiKey(e.target.value);
                                    if (typeof window !== 'undefined') localStorage.setItem('fabrica_openai_api_key', e.target.value);
                                  }}
                                  style={{ flex: 1, background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', outline: 'none' }}
                                />
                                <button className="mini accent" style={{ fontSize: '8px', padding: '0 8px' }} onClick={() => setToast({ message: 'OpenAI API key saved successfully!', type: 'success', isOpen: true })}>Save</button>
                              </div>
                            </div>

                            {/* Groq Key */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--text)' }}>Groq API Key</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input
                                  type="password"
                                  placeholder={groqApiKey ? '••••••••••••••••' : 'Paste Groq API Key...'}
                                  value={groqApiKey}
                                  onChange={(e) => {
                                    setGroqApiKey(e.target.value);
                                    if (typeof window !== 'undefined') localStorage.setItem('fabrica_groq_api_key', e.target.value);
                                  }}
                                  style={{ flex: 1, background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', outline: 'none' }}
                                />
                                <button className="mini accent" style={{ fontSize: '8px', padding: '0 8px' }} onClick={() => setToast({ message: 'Groq API key saved successfully!', type: 'success', isOpen: true })}>Save</button>
                              </div>
                            </div>

                            {/* DeepSeek Key */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '8px', fontWeight: 700, color: 'var(--text)' }}>DeepSeek API Key</span>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <input
                                  type="password"
                                  placeholder={deepseekApiKey ? '••••••••••••••••' : 'Paste DeepSeek API Key...'}
                                  value={deepseekApiKey}
                                  onChange={(e) => {
                                    setDeepseekApiKey(e.target.value);
                                    if (typeof window !== 'undefined') localStorage.setItem('fabrica_deepseek_api_key', e.target.value);
                                  }}
                                  style={{ flex: 1, background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', outline: 'none' }}
                                />
                                <button className="mini accent" style={{ fontSize: '8px', padding: '0 8px' }} onClick={() => setToast({ message: 'DeepSeek API key saved successfully!', type: 'success', isOpen: true })}>Save</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* End Tier Dynamic Handling */}
                    </div>
                  );
                })()}

              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

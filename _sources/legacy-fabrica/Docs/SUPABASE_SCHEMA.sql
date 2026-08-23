-- ==============================================================================
-- FABRICA MASTER SUPABASE SCHEMA & SECURITY POLICIES
-- ==============================================================================
-- Description: Complete SQL script for all tables, RLS policies, indexes,
--              seeds, and auth triggers used by Fabrica AI Studio.
-- Instructions: Run this entire script in your Supabase SQL Editor.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE DEFINITIONS
-- ------------------------------------------------------------------------------

-- Table 1: key_pools (Server API Key Vault)
-- Purpose: Holds encrypted LLM provider API keys (OpenRouter, Gemini, Anthropic, OpenAI, etc.).
-- Security Level: SERVER ONLY. Strictly isolated from browser/client access.
CREATE TABLE IF NOT EXISTS public.key_pools (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    provider TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    masked_key TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_byok BOOLEAN NOT NULL DEFAULT false,
    usage_count BIGINT NOT NULL DEFAULT 0,
    error_count BIGINT NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 2: user_tiers (User Plan, Infrastructure IDs & Quotas)
-- Purpose: Manages tenant subscription tiers, card verification status, dedicated GCS bucket ID, container ID, onboarding completion status, and tenant credentials.
-- Security Level: USER READ-ONLY (own row), SERVER READ-WRITE.
CREATE TABLE IF NOT EXISTS public.user_tiers (
    tenant_id TEXT PRIMARY KEY,
    plan TEXT NOT NULL DEFAULT 'free',
    has_verified_card BOOLEAN NOT NULL DEFAULT false,
    monthly_token_quota BIGINT NOT NULL DEFAULT 1000000,
    used_tokens_this_month BIGINT NOT NULL DEFAULT 0,
    bucket_id TEXT,
    container_id TEXT,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table 3: api_providers (AI Model Provider Registry)
-- Purpose: Stores active AI provider configurations and model white-lists.
-- Security Level: PUBLIC READ-ONLY (active providers), SERVER READ-WRITE.
CREATE TABLE IF NOT EXISTS public.api_providers (
    provider_slug TEXT PRIMARY KEY,
    provider_name TEXT NOT NULL,
    default_model TEXT NOT NULL,
    allowed_models JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. INDEXES
-- ------------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_key_pools_provider ON public.key_pools(provider);
CREATE INDEX IF NOT EXISTS idx_key_pools_is_active ON public.key_pools(is_active);
CREATE INDEX IF NOT EXISTS idx_user_tiers_plan ON public.user_tiers(plan);
CREATE INDEX IF NOT EXISTS idx_api_providers_is_active ON public.api_providers(is_active);

-- ------------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) ENABLEMENT
-- ------------------------------------------------------------------------------

ALTER TABLE public.key_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_providers ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------

-- RLS Policies for key_pools
-- Note: Service Role (server backend) bypasses RLS automatically.
-- Clients (anon / authenticated) have NO access to key_pools to prevent key leakage.
DROP POLICY IF EXISTS "Deny public access to key_pools" ON public.key_pools;
-- No permissive policy added for anon or authenticated roles on key_pools.

-- RLS Policies for user_tiers
-- Authenticated users can view their own tier/quota record.
DROP POLICY IF EXISTS "Users can view own tier" ON public.user_tiers;
CREATE POLICY "Users can view own tier" 
    ON public.user_tiers 
    FOR SELECT 
    TO authenticated 
    USING (tenant_id = auth.uid()::text);

-- RLS Policies for api_providers
-- Anyone (anon or authenticated) can view active AI providers.
DROP POLICY IF EXISTS "Anyone can view active api_providers" ON public.api_providers;
CREATE POLICY "Anyone can view active api_providers" 
    ON public.api_providers 
    FOR SELECT 
    TO anon, authenticated 
    USING (is_active = true);

-- ------------------------------------------------------------------------------
-- 5. INITIAL SEED DATA
-- ------------------------------------------------------------------------------

-- Populate Default AI Providers
INSERT INTO public.api_providers (provider_slug, provider_name, default_model, allowed_models, is_active)
VALUES 
    ('google', 'Google AI', 'gemini-2.5-flash', '["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"]'::jsonb, true),
    ('openrouter', 'OpenRouter', 'google/gemini-2.5-flash', '["google/gemini-2.5-flash", "anthropic/claude-3.5-sonnet", "deepseek/deepseek-r1"]'::jsonb, true),
    ('anthropic', 'Anthropic', 'claude-3-5-sonnet-20241022', '["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"]'::jsonb, true),
    ('openai', 'OpenAI', 'gpt-4o', '["gpt-4o", "gpt-4o-mini", "o3-mini"]'::jsonb, true),
    ('groq', 'Groq', 'llama-3.3-70b-versatile', '["llama-3.3-70b-versatile", "mixtral-8x7b-32768"]'::jsonb, true),
    ('deepseek', 'DeepSeek', 'deepseek-chat', '["deepseek-chat", "deepseek-reasoner"]'::jsonb, true)
ON CONFLICT (provider_slug) 
DO UPDATE SET 
    default_model = EXCLUDED.default_model,
    allowed_models = EXCLUDED.allowed_models,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Populate Default User Tier for System Admin / Default User
INSERT INTO public.user_tiers (tenant_id, plan, has_verified_card, monthly_token_quota, used_tokens_this_month, bucket_id, container_id, onboarding_completed, credentials)
VALUES ('default_user', 'pro', true, 10000000, 0, 'fabrica-tenant-default-user', 'fabrica-runner-default-user', true, '{"kms_status": "active", "api_key_vault": "configured"}'::jsonb)
ON CONFLICT (tenant_id) DO UPDATE SET
    bucket_id = EXCLUDED.bucket_id,
    container_id = EXCLUDED.container_id,
    onboarding_completed = EXCLUDED.onboarding_completed,
    credentials = EXCLUDED.credentials,
    updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 6. AUTOMATIC AUTH TRIGGER FOR NEW USERS
-- ------------------------------------------------------------------------------

-- Function to handle newly registered users via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_tiers (tenant_id, plan, has_verified_card, monthly_token_quota, used_tokens_this_month, bucket_id, container_id, onboarding_completed, credentials)
    VALUES (
        NEW.id::text,
        'free',
        false,
        1000000,
        0,
        'fabrica-tenant-' || lower(regexp_replace(NEW.id::text, '[^a-zA-Z0-9]', '-', 'g')),
        'fabrica-runner-' || lower(regexp_replace(NEW.id::text, '[^a-zA-Z0-9]', '-', 'g')),
        true,
        jsonb_build_object('kms_status', 'active', 'api_key_vault', 'configured', 'created_at', NOW())
    )
    ON CONFLICT (tenant_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger firing on new user signup in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- END OF MASTER SCHEMA SCRIPT
-- ==============================================================================

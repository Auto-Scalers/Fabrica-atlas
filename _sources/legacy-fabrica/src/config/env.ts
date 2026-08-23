export const ENV = {
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  GCP_PROJECT_ID: process.env.GCP_PROJECT_ID || 'fabrica-production',
  GCP_REGION: process.env.GCP_REGION || 'europe-west2',
  RUNNER_CONTAINER_IMAGE: process.env.RUNNER_CONTAINER_IMAGE || '',
  SHARED_KERNEL_GCS_BUCKET: process.env.SHARED_KERNEL_GCS_BUCKET || 'fabrica-global-kernel-prod',
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
};

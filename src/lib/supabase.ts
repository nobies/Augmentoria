import { createClient } from '@supabase/supabase-js';

// Supabase publishable keys are designed for browser distribution. Environment
// variables override this deployment default, so key rotation needs no code change.
const deploymentDefault = {
  url: 'https://ygdqiuvysbkcdnoxjgxv.supabase.co',
  publishableKey: 'sb_publishable_rb2otWUPrMU6UzvR1PDJQg_hNasGrv8',
};

const url =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  deploymentDefault.url;
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  deploymentDefault.publishableKey;

export const supabase =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      })
    : null;

export const isSupabaseConfigured = Boolean(supabase);

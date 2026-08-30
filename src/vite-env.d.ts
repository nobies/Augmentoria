/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_PUBLIC_APP_URL?: string;
  readonly VITE_REQUIRE_REVIEW_SHARE_CODE?: string;
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

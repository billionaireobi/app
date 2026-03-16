// Type declarations for EXPO_PUBLIC_* environment variables.
// Expo inlines these at build time from .env / .env.development / .env.local.
declare namespace NodeJS {
  interface ProcessEnv {
    readonly EXPO_PUBLIC_API_URL: string;
  }
}

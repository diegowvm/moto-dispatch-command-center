// Environment configuration
export const env = {
  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '',
  
  // Mapbox
  MAPBOX_ACCESS_TOKEN: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '',
  
  // External APIs
  OPENCAGE_API_KEY: import.meta.env.VITE_OPENCAGE_API_KEY || '',
  HEIGIT_API_KEY: import.meta.env.VITE_HEIGIT_API_KEY || '',
  OPENROUTESERVICE_URL: import.meta.env.VITE_OPENROUTESERVICE_URL || '',
  
  // OneSignal
  ONESIGNAL_APP_ID: import.meta.env.VITE_ONESIGNAL_APP_ID || '',
  
  // Application
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Moto Dispatch Command Center',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Development
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
] as const;

for (const envVar of requiredEnvVars) {
  if (!env[envVar]) {
    throw new Error(`Missing required environment variable: VITE_${envVar}`);
  }
}

export default env;


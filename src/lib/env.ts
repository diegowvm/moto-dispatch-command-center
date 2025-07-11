// Environment configuration
export const env = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    serviceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '',
  },
  mapbox: {
    accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '',
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Moto Dispatch Command Center',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  },
} as const;

// Validation
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_MAPBOX_ACCESS_TOKEN',
] as const;

export const validateEnv = () => {
  const missing = requiredEnvVars.filter(
    (key) => !import.meta.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
};

// Auto-validate in development
if (import.meta.env.DEV) {
  try {
    validateEnv();
  } catch (error) {
    console.error('Environment validation failed:', error);
  }
}


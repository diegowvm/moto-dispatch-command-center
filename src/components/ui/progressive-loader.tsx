import React, { Suspense } from "react";
import { ErrorBoundary } from "./error-boundary";
import { Skeleton } from "./skeleton";

interface ProgressiveLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

const DefaultFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  </div>
);

const DefaultErrorFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <p className="text-destructive">Erro ao carregar componente</p>
      <button 
        onClick={() => window.location.reload()} 
        className="mt-2 text-sm text-muted-foreground hover:text-foreground"
      >
        Tentar novamente
      </button>
    </div>
  </div>
);

export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({ 
  children, 
  fallback = <DefaultFallback />,
  errorFallback = <DefaultErrorFallback />
}) => {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

// Hook para lazy loading com retry
export const useLazyWithRetry = (importFunc: () => Promise<any>, retries = 3) => {
  return React.lazy(async () => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await importFunc();
      } catch (error) {
        lastError = error as Error;
        // Aguarda um pouco antes de tentar novamente
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
    
    throw lastError;
  });
};
import React from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface QueryErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const QueryErrorFallback: React.FC<QueryErrorFallbackProps> = ({ error, resetErrorBoundary }) => (
  <Card className="border-destructive/20 bg-destructive/5">
    <CardHeader>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <CardTitle className="text-destructive">Erro no Carregamento</CardTitle>
      </div>
      <CardDescription>
        Ocorreu um erro ao carregar os dados. Tente novamente.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <details className="mb-4">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
          Ver detalhes técnicos
        </summary>
        <pre className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded overflow-auto">
          {error.message}
        </pre>
      </details>
      <Button 
        onClick={resetErrorBoundary} 
        variant="outline"
        className="w-full"
      >
        <RefreshCw className="h-4 w-4 mr-2" />
        Tentar Novamente
      </Button>
    </CardContent>
  </Card>
);

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
}

export const QueryErrorBoundary: React.FC<QueryErrorBoundaryProps> = ({ children }) => (
  <QueryErrorResetBoundary>
    {({ reset }) => (
      <ErrorBoundary
        FallbackComponent={QueryErrorFallback}
        onReset={reset}
        resetKeys={['query-error']}
      >
        {children}
      </ErrorBoundary>
    )}
  </QueryErrorResetBoundary>
);
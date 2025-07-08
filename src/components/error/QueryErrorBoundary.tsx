import React from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { AdvancedErrorBoundary } from './AdvancedErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Wifi, Database } from 'lucide-react';

interface QueryErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  retryCount?: number;
}

const QueryErrorFallback: React.FC<QueryErrorFallbackProps> = ({ 
  error, 
  resetErrorBoundary,
  retryCount = 0 
}) => {
  const isNetworkError = error.message.includes('NetworkError') || 
                        error.message.includes('fetch') ||
                        error.message.includes('CORS');
  
  const isDatabaseError = error.message.includes('postgres') ||
                         error.message.includes('supabase') ||
                         error.message.includes('database');

  const getErrorIcon = () => {
    if (isNetworkError) return <Wifi className="h-5 w-5 text-destructive" />;
    if (isDatabaseError) return <Database className="h-5 w-5 text-destructive" />;
    return <AlertTriangle className="h-5 w-5 text-destructive" />;
  };

  const getErrorTitle = () => {
    if (isNetworkError) return 'Erro de Conexão';
    if (isDatabaseError) return 'Erro no Banco de Dados';
    return 'Erro no Carregamento';
  };

  const getErrorDescription = () => {
    if (isNetworkError) {
      return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
    }
    if (isDatabaseError) {
      return 'Erro ao acessar os dados. Tente novamente em alguns instantes.';
    }
    return 'Ocorreu um erro inesperado ao carregar os dados.';
  };

  const getSuggestions = () => {
    if (isNetworkError) {
      return [
        'Verifique sua conexão com a internet',
        'Tente desabilitar temporariamente o firewall/antivírus',
        'Recarregue a página'
      ];
    }
    if (isDatabaseError) {
      return [
        'Aguarde alguns minutos e tente novamente',
        'Verifique se o serviço está funcionando',
        'Entre em contato com o suporte se persistir'
      ];
    }
    return [
      'Recarregue a página',
      'Limpe o cache do navegador',
      'Tente novamente mais tarde'
    ];
  };

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          {getErrorIcon()}
          <div>
            <CardTitle className="text-destructive">{getErrorTitle()}</CardTitle>
            <CardDescription>
              {getErrorDescription()}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Message */}
        <div className="p-3 bg-muted rounded text-sm">
          <strong>Detalhes:</strong> {error.message}
        </div>

        {/* Retry Info */}
        {retryCount > 0 && (
          <div className="text-sm text-muted-foreground">
            Tentativas realizadas: {retryCount}
          </div>
        )}

        {/* Suggestions */}
        <div>
          <h4 className="font-medium mb-2">O que você pode fazer:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {getSuggestions().map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>

        {/* Action Button */}
        <Button 
          onClick={resetErrorBoundary} 
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Tentar Novamente
        </Button>

        {/* Development Details */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium">
              Detalhes do Erro (Desenvolvimento)
            </summary>
            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
};

interface QueryErrorBoundaryProps {
  children: React.ReactNode;
  name?: string;
}

export const QueryErrorBoundary: React.FC<QueryErrorBoundaryProps> = ({ 
  children, 
  name = 'Query' 
}) => (
  <QueryErrorResetBoundary>
    {({ reset }) => (
      <AdvancedErrorBoundary
        name={name}
        level="component"
        onError={(error, errorInfo) => {
          console.error(`Query Error in ${name}:`, {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack
          });
        }}
        fallback={
          <QueryErrorFallback 
            error={new Error('Query failed to load')} 
            resetErrorBoundary={reset}
          />
        }
      >
        {children}
      </AdvancedErrorBoundary>
    )}
  </QueryErrorResetBoundary>
);
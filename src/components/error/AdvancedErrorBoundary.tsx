import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Bug, Clock, Wifi, MemoryStick } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'critical';
  name?: string;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorId: string;
  timestamp: number;
}

export class AdvancedErrorBoundary extends Component<Props, State> {
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: '',
      timestamp: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error details
    console.error('🚨 Error Boundary Caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      level: this.props.level,
      name: this.props.name,
      timestamp: new Date().toISOString()
    });

    // Report to external service (if configured)
    this.reportError(error, errorInfo);
    
    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Here you would send to your error reporting service
    // Example: Sentry, LogRocket, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      level: this.props.level || 'component',
      name: this.props.name || 'Unknown Component',
      errorId: this.state.errorId
    };

    console.log('Error Report:', errorReport);
    
    // Send to analytics or error tracking service
    // analytics.track('Error Boundary Triggered', errorReport);
  };

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
      
      // Auto-retry with exponential backoff for critical errors
      if (this.props.level === 'critical') {
        this.scheduleAutoRetry();
      }
    }
  };

  private scheduleAutoRetry = () => {
    const delay = Math.pow(2, this.state.retryCount) * 1000; // Exponential backoff
    
    this.retryTimer = setTimeout(() => {
      this.handleRetry();
    }, delay);
  };

  private handleReload = () => {
    window.location.reload();
  };

  private getErrorSeverity = (): 'low' | 'medium' | 'high' | 'critical' => {
    const { level } = this.props;
    const { error } = this.state;
    
    if (level === 'critical') return 'critical';
    if (level === 'page') return 'high';
    
    // Analyze error type
    if (error?.name === 'ChunkLoadError') return 'medium';
    if (error?.message.includes('Network')) return 'medium';
    if (error?.message.includes('Memory')) return 'high';
    
    return 'low';
  };

  private getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  private getErrorSuggestions = (): string[] => {
    const { error } = this.state;
    const suggestions: string[] = [];
    
    if (error?.name === 'ChunkLoadError') {
      suggestions.push('Recarregue a página para baixar os arquivos atualizados');
      suggestions.push('Verifique sua conexão com a internet');
    }
    
    if (error?.message.includes('Network')) {
      suggestions.push('Verifique sua conexão com a internet');
      suggestions.push('Tente novamente em alguns minutos');
    }
    
    if (error?.message.includes('Memory')) {
      suggestions.push('Feche outras abas do navegador');
      suggestions.push('Reinicie o navegador');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('Tente atualizar a página');
      suggestions.push('Limpe o cache do navegador');
    }
    
    return suggestions;
  };

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  render() {
    const { hasError, error, errorInfo, retryCount, errorId, timestamp } = this.state;
    const { children, fallback, maxRetries = 3, level = 'component', name } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const severity = this.getErrorSeverity();
      const suggestions = this.getErrorSuggestions();
      const canRetry = retryCount < maxRetries;

      return (
        <Card className="border-destructive/20 bg-destructive/5 max-w-2xl mx-auto my-4">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <div>
                  <CardTitle className="text-destructive">
                    Erro no {level === 'page' ? 'Carregamento da Página' : 'Componente'}
                  </CardTitle>
                  <CardDescription>
                    {name && `Componente: ${name} • `}
                    ID: {errorId}
                  </CardDescription>
                </div>
              </div>
              <Badge className={`${this.getSeverityColor(severity)} text-white`}>
                {severity.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Error Message */}
            <Alert>
              <Bug className="h-4 w-4" />
              <AlertDescription>
                <strong>Erro:</strong> {error?.message || 'Erro desconhecido'}
              </AlertDescription>
            </Alert>

            {/* Error Details */}
            <div className="text-sm text-muted-foreground space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Ocorreu em: {new Date(timestamp).toLocaleString('pt-BR')}</span>
              </div>
              {retryCount > 0 && (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  <span>Tentativas de recuperação: {retryCount}/{maxRetries}</span>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Sugestões para resolver:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              {canRetry && (
                <Button 
                  onClick={this.handleRetry} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Tentar Novamente ({maxRetries - retryCount} restantes)
                </Button>
              )}
              
              <Button 
                onClick={this.handleReload} 
                variant={canRetry ? "secondary" : "default"}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Recarregar Página
              </Button>
            </div>

            {/* Technical Details (Collapsible) */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Detalhes Técnicos (Desenvolvimento)
                </summary>
                <div className="mt-2 p-3 bg-muted rounded text-xs font-mono">
                  <div><strong>Stack:</strong></div>
                  <pre className="whitespace-pre-wrap break-all text-xs">
                    {error?.stack}
                  </pre>
                  {errorInfo && (
                    <>
                      <div className="mt-2"><strong>Component Stack:</strong></div>
                      <pre className="whitespace-pre-wrap break-all text-xs">
                        {errorInfo.componentStack}
                      </pre>
                    </>
                  )}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return children;
  }
}
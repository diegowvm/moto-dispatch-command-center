import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="bg-card border-border m-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-foreground">Algo deu errado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            {this.state.error && (
              <details className="text-sm text-left bg-muted p-3 rounded">
                <summary className="cursor-pointer font-medium mb-2 text-foreground">
                  Detalhes do erro
                </summary>
                <pre className="text-muted-foreground overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex justify-center space-x-2">
              <Button onClick={this.handleRetry} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
              <Button onClick={() => window.location.reload()} variant="default">
                Recarregar página
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
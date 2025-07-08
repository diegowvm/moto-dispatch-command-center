import React from 'react';
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor';
import { useQueryPerformance } from '@/hooks/useQueryPerformance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Database, Activity, Zap, AlertTriangle } from 'lucide-react';

const PerformancePage = () => {
  const { getQueryCacheMetrics, getSlowQueries, clearQueryMetrics } = useQueryPerformance();
  
  const cacheMetrics = getQueryCacheMetrics();
  const slowQueries = getSlowQueries();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Performance Dashboard</h1>
        <p className="text-muted-foreground">
          Monitoramento completo de performance e otimização da aplicação
        </p>
      </div>

      {/* Performance Monitor */}
      <PerformanceMonitor />

      {/* Query Cache Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <div>
                <CardTitle>Cache de Queries</CardTitle>
                <CardDescription>
                  Status e métricas do cache de dados
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded">
                <div className="font-semibold text-2xl">{cacheMetrics.totalQueries}</div>
                <div className="text-xs text-muted-foreground">Total Queries</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded">
                <div className="font-semibold text-2xl text-green-600">{cacheMetrics.successQueries}</div>
                <div className="text-xs text-muted-foreground">Sucessos</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded">
                <div className="font-semibold text-2xl text-yellow-600">{cacheMetrics.staleQueries}</div>
                <div className="text-xs text-muted-foreground">Desatualizadas</div>
              </div>
              
              <div className="text-center p-3 bg-muted/50 rounded">
                <div className="font-semibold text-2xl text-red-600">{cacheMetrics.errorQueries}</div>
                <div className="text-xs text-muted-foreground">Erros</div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-sm text-muted-foreground">
                Cache Size: {(cacheMetrics.cacheSize / 1024).toFixed(1)}KB
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearQueryMetrics}
              >
                Limpar Cache
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Slow Queries */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <CardTitle>Queries Lentas</CardTitle>
                <CardDescription>
                  Consultas que demoram mais de 2 segundos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {slowQueries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-2 text-green-500" />
                <p>Nenhuma query lenta detectada!</p>
                <p className="text-sm">Todas as consultas estão otimizadas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {slowQueries.map((query, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <div className="font-medium text-sm">
                        {Array.isArray(query.queryKey) ? query.queryKey.join('-') : 'Unknown'}
                      </div>
                      {query.error && (
                        <div className="text-xs text-red-600 mt-1">
                          {query.error instanceof Error ? query.error.message : 'Error'}
                        </div>
                      )}
                    </div>
                    <Badge variant={query.status === 'error' ? 'destructive' : 'secondary'}>
                      {query.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Dicas de Otimização</CardTitle>
          <CardDescription>
            Estratégias para melhorar a performance da aplicação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Frontend
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Use lazy loading para componentes pesados</li>
                <li>• Implemente code splitting por rotas</li>
                <li>• Otimize imagens com WebP e compressão</li>
                <li>• Use React.memo para componentes puros</li>
                <li>• Minimize re-renders desnecessários</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Backend/Queries
              </h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Configure staleTime adequado por tipo de dado</li>
                <li>• Use select para buscar apenas campos necessários</li>
                <li>• Implemente paginação para listas grandes</li>
                <li>• Configure cache com TTL estratégico</li>
                <li>• Use realtime ao invés de polling</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformancePage;
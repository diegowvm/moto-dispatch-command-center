import React, { useState } from 'react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Zap, 
  Database, 
  Wifi, 
  MemoryStick, 
  Package, 
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface PerformanceMonitorProps {
  className?: string;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ className }) => {
  const { metrics, alerts, getPerformanceReport, clearAlerts } = usePerformanceMonitor();
  const [showDetails, setShowDetails] = useState(false);

  const getPerformanceScore = () => {
    let score = 100;
    
    // Penalize slow metrics
    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 2500) score -= 20;
    if (metrics.firstContentfulPaint && metrics.firstContentfulPaint > 1800) score -= 15;
    if (metrics.avgQueryTime && metrics.avgQueryTime > 1000) score -= 15;
    if (metrics.bundleSize && metrics.bundleSize > 1.5) score -= 10;
    if (metrics.isLowMemory) score -= 20;
    if (metrics.isSlowConnection) score -= 10;
    
    return Math.max(0, score);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 70) return <TrendingUp className="h-5 w-5 text-yellow-600" />;
    return <TrendingDown className="h-5 w-5 text-red-600" />;
  };

  const formatTime = (time: number) => {
    if (time > 1000) return `${(time / 1000).toFixed(2)}s`;
    return `${Math.round(time)}ms`;
  };

  const performanceScore = getPerformanceScore();
  const report = getPerformanceReport();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <div>
              <CardTitle>Monitor de Performance</CardTitle>
              <CardDescription>
                Métricas em tempo real da aplicação
              </CardDescription>
            </div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getScoreColor(performanceScore)}`}>
            {getScoreIcon(performanceScore)}
            <span className="font-bold">{performanceScore}/100</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Performance Score */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Score Geral</span>
            <span>{performanceScore}/100</span>
          </div>
          <Progress value={performanceScore} className="h-2" />
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription>
              <div className="flex justify-between items-start">
                <div>
                  <strong>Alertas de Performance ({alerts.length})</strong>
                  <ul className="mt-1 text-sm">
                    {alerts.slice(0, 3).map((alert, index) => (
                      <li key={index}>• {alert}</li>
                    ))}
                    {alerts.length > 3 && (
                      <li>• ... e mais {alerts.length - 3} alertas</li>
                    )}
                  </ul>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAlerts}
                  className="text-yellow-600 hover:text-yellow-700"
                >
                  Limpar
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Page Load Time */}
          {metrics.pageLoadTime && (
            <div className="text-center p-3 bg-muted/50 rounded">
              <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="font-semibold">{formatTime(metrics.pageLoadTime)}</div>
              <div className="text-xs text-muted-foreground">Carregamento</div>
            </div>
          )}

          {/* LCP */}
          {metrics.largestContentfulPaint && (
            <div className="text-center p-3 bg-muted/50 rounded">
              <Zap className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="font-semibold">{formatTime(metrics.largestContentfulPaint)}</div>
              <div className="text-xs text-muted-foreground">LCP</div>
            </div>
          )}

          {/* Avg Query Time */}
          {metrics.avgQueryTime && (
            <div className="text-center p-3 bg-muted/50 rounded">
              <Database className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="font-semibold">{formatTime(metrics.avgQueryTime)}</div>
              <div className="text-xs text-muted-foreground">Query Média</div>
            </div>
          )}

          {/* Bundle Size */}
          {metrics.bundleSize && (
            <div className="text-center p-3 bg-muted/50 rounded">
              <Package className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
              <div className="font-semibold">{metrics.bundleSize.toFixed(1)}MB</div>
              <div className="text-xs text-muted-foreground">Bundle</div>
            </div>
          )}
        </div>

        {/* Connection & Memory Status */}
        <div className="flex gap-2">
          {metrics.effectiveType && (
            <Badge variant={metrics.isSlowConnection ? "destructive" : "secondary"}>
              <Wifi className="h-3 w-3 mr-1" />
              {metrics.effectiveType.toUpperCase()}
            </Badge>
          )}
          
          {metrics.memoryUsage && (
            <Badge variant={metrics.isLowMemory ? "destructive" : "secondary"}>
              <MemoryStick className="h-3 w-3 mr-1" />
              {metrics.memoryUsage.toFixed(1)}% RAM
            </Badge>
          )}
        </div>

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Recomendações:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              {report.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Detailed Metrics */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDetails(!showDetails)}
          className="w-full"
        >
          {showDetails ? 'Ocultar' : 'Ver'} Detalhes Técnicos
        </Button>

        {showDetails && (
          <div className="space-y-2 text-sm bg-muted/50 p-3 rounded">
            <div><strong>First Contentful Paint:</strong> {formatTime(metrics.firstContentfulPaint || 0)}</div>
            <div><strong>DOM Content Loaded:</strong> {formatTime(metrics.domContentLoaded || 0)}</div>
            <div><strong>Connection Type:</strong> {metrics.connectionType || 'Unknown'}</div>
            
            {metrics.queryTimes && Object.keys(metrics.queryTimes).length > 0 && (
              <div>
                <strong>Query Times:</strong>
                <ul className="ml-4 mt-1">
                  {Object.entries(metrics.queryTimes).map(([key, time]) => (
                    <li key={key}>{key}: {formatTime(time)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
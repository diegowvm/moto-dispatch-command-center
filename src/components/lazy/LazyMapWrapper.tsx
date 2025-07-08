import React, { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { MapPin, Loader2 } from 'lucide-react';

interface LazyMapWrapperProps {
  children: React.ReactNode;
  title?: string;
  height?: string;
  className?: string;
}

// Skeleton Loading para mapas
const MapSkeleton = ({ title, height = "500px" }: { 
  title?: string; 
  height?: string; 
}) => (
  <Card className="bg-card border-border">
    {title && (
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
    )}
    <CardContent className={title ? '' : 'p-0'}>
      <div 
        className={`h-[${height}] bg-muted rounded-lg flex items-center justify-center relative overflow-hidden`}
        style={{ height }}
      >
        {/* Animação de carregamento de mapa */}
        <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted"></div>
        <div className="absolute top-4 left-4 w-32 h-6 bg-background/50 rounded animate-pulse"></div>
        <div className="absolute top-4 right-4 w-10 h-10 bg-background/50 rounded animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-24 h-4 bg-background/50 rounded animate-pulse"></div>
        
        {/* Ícone central */}
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="relative">
            <MapPin className="h-12 w-12 animate-pulse" />
            <Loader2 className="h-6 w-6 animate-spin absolute -top-1 -right-1 text-primary" />
          </div>
          <p className="text-sm font-medium">Carregando mapa...</p>
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i} 
                className="w-2 h-2 bg-primary rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.1}s` }}
              ></div>
            ))}
          </div>
        </div>
        
        {/* Pontos simulados no mapa */}
        <div className="absolute top-1/3 left-1/4 w-3 h-3 bg-primary rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 right-1/3 w-3 h-3 bg-accent rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/3 left-1/2 w-3 h-3 bg-success rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
    </CardContent>
  </Card>
);

export const LazyMapWrapper: React.FC<LazyMapWrapperProps> = ({ 
  children, 
  title, 
  height = "500px",
  className 
}) => {
  const { targetRef, shouldLoad } = useIntersectionObserver({
    threshold: 0.05, // Threshold menor para mapas (carregam mais cedo)
    rootMargin: '200px', // Margem maior para mapas pesados
    triggerOnce: true
  });

  return (
    <div ref={targetRef} className={className}>
      {shouldLoad ? (
        <Suspense fallback={<MapSkeleton title={title} height={height} />}>
          {children}
        </Suspense>
      ) : (
        <MapSkeleton title={title} height={height} />
      )}
    </div>
  );
};
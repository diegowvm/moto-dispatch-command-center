import React, { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface LazyChartWrapperProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  height?: string;
  className?: string;
}

// Skeleton Loading para gráficos
const ChartSkeleton = ({ title, description, height = "300px" }: { 
  title: string; 
  description?: string; 
  height?: string; 
}) => (
  <Card className="bg-card border-border">
    <CardHeader>
      <CardTitle className="text-foreground">{title}</CardTitle>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </CardHeader>
    <CardContent>
      <div className={`h-[${height}] flex items-center justify-center`}>
        <div className="animate-pulse w-full">
          <div className="h-4 w-48 bg-muted rounded mb-8 mx-auto"></div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-end space-x-2">
                <div className="h-2 w-full bg-muted rounded"></div>
                <div className={`h-${Math.floor(Math.random() * 20) + 4} w-full bg-muted rounded`}></div>
                <div className="h-6 w-full bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const LazyChartWrapper: React.FC<LazyChartWrapperProps> = ({ 
  children, 
  title, 
  description, 
  height = "300px",
  className 
}) => {
  const { targetRef, shouldLoad } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px', // Carregar quando estiver 100px antes de aparecer
    triggerOnce: true
  });

  return (
    <div ref={targetRef} className={className}>
      {shouldLoad ? (
        <Suspense fallback={<ChartSkeleton title={title} description={description} height={height} />}>
          {children}
        </Suspense>
      ) : (
        <ChartSkeleton title={title} description={description} height={height} />
      )}
    </div>
  );
};
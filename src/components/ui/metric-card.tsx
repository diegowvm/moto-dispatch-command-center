import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  description?: string;
  className?: string;
  loading?: boolean;
}

export const MetricCard = React.memo(({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  description,
  className,
  loading = false
}: MetricCardProps) => {
  if (loading) {
    return (
      <Card className={cn("bg-card border-border", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-4 w-4 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2" />
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const trendColor = trend === "up" ? "text-success" : 
                    trend === "down" ? "text-destructive" : 
                    "text-muted-foreground";

  return (
    <Card className={cn("bg-card border-border hover:shadow-lg transition-all duration-300", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        
        {trendValue && (
          <div className={cn("text-xs flex items-center", trendColor)}>
            {trendValue}
          </div>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
});
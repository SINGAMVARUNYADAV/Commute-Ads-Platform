import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface StatsCardProps {
  title: string
  value: string | number
  icon: ReactNode
  description?: string
  trend?: { value: number; isUp: boolean }
  pulse?: boolean
  className?: string
}

export function StatsCard({ title, value, icon, description, trend, pulse, className }: StatsCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-heading font-medium tracking-widest text-muted-foreground uppercase">
            {title}
          </p>
          <div className={`w-8 h-8 flex items-center justify-center rounded bg-primary/10 text-primary ${pulse ? 'animate-pulse text-destructive bg-destructive/20 shadow-[0_0_15px_rgba(255,0,60,0.5)]' : ''}`}>
            {icon}
          </div>
        </div>
        <div className="flex flex-col gap-1 mt-2">
          <div className="text-3xl font-mono font-bold">
            {value}
          </div>
          {(description || trend) && (
            <p className="text-xs text-muted-foreground font-mono flex items-center gap-2">
              {trend && (
                <span className={trend.isUp ? "text-green-400" : "text-destructive"}>
                  {trend.isUp ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
              )}
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

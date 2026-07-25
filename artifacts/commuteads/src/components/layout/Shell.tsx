import * as React from "react"
import { Link, useLocation } from "wouter"
import { LayoutDashboard, RadioReceiver, MonitorPlay, AlertTriangle, FileVideo, Users, Presentation } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGetRecentAlerts } from "@workspace/api-client-react"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fleet", label: "Fleet", icon: RadioReceiver },
  { href: "/campaigns", label: "Campaigns", icon: Presentation },
  { href: "/ad-assets", label: "Ad Assets", icon: FileVideo },
  { href: "/content", label: "Content", icon: MonitorPlay },
  { href: "/sos", label: "SOS Alerts", icon: AlertTriangle, badge: true },
  { href: "/advertiser", label: "Advertiser Portal", icon: Users },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation()
  
  // We'll just fetch alerts minimally to show the badge indicator if pending alerts exist
  const { data: alerts } = useGetRecentAlerts({ query: { queryKey: ["/api/dashboard/recent-alerts"], refetchInterval: 15000 } })
  const pendingAlerts = alerts?.filter(a => a.status === "PENDING").length || 0

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row bg-background">
      <div className="noise-overlay" />
      <aside className="w-full md:w-64 border-r border-border bg-sidebar flex-shrink-0 flex flex-col z-10">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <div className="font-heading font-bold text-xl tracking-widest text-primary flex items-center gap-2">
            <RadioReceiver className="w-5 h-5 text-primary" />
            COMMUTE<span className="text-foreground">ADS</span>
          </div>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href} className="block">
                <span className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md font-heading font-semibold tracking-wide transition-all group",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[inset_4px_0_0_0_hsl(var(--primary))]" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  {item.label}
                  {item.badge && pendingAlerts > 0 && (
                    <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-mono text-destructive-foreground animate-pulse shadow-[0_0_8px_rgba(255,0,60,0.8)]">
                      {pendingAlerts}
                    </span>
                  )}
                </span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-border text-xs font-mono text-muted-foreground flex justify-between">
          <span>SYS.OP.ONLINE</span>
          <span className="text-primary animate-pulse">●</span>
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative z-10">
        {pendingAlerts > 0 && location !== "/sos" && (
          <div className="bg-destructive/20 border-b border-destructive text-destructive px-4 py-2 flex items-center justify-center gap-2 font-mono text-sm animate-pulse shadow-[inset_0_0_20px_rgba(255,0,60,0.2)]">
            <AlertTriangle className="w-4 h-4" />
            WARNING: {pendingAlerts} PENDING SOS ALERT{pendingAlerts > 1 ? 'S' : ''} DETECTED
            <Link href="/sos" className="ml-4 underline font-bold hover:text-white">VIEW NOW</Link>
          </div>
        )}
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
          <div className="relative z-10 h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetImpressionTimeline, getGetImpressionTimelineQueryKey, useListDevices, getListDevicesQueryKey } from "@workspace/api-client-react"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { FleetMap } from "@/components/dashboard/FleetMap"
import { RadioReceiver, AlertTriangle, Presentation, Eye, Battery, Signal, Zap } from "lucide-react"
import { formatNumber } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

export function Dashboard() {
  const summaryQuery = useGetDashboardSummary({ query: { refetchInterval: 15000, queryKey: getGetDashboardSummaryQueryKey() } })
  const timelineQuery = useGetImpressionTimeline({ query: { queryKey: getGetImpressionTimelineQueryKey() } })
  const devicesQuery = useListDevices(undefined, { query: { refetchInterval: 15000, queryKey: getListDevicesQueryKey() } })

  const summary = summaryQuery.data
  const timeline = timelineQuery.data
  const devices = devicesQuery.data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-widest text-primary">MISSION CONTROL</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Global view of fleet and campaigns</p>
        </div>
        <div className="flex gap-2">
          {summary?.pendingSosAlerts ? (
            <Badge variant="destructive" className="animate-pulse px-3 py-1 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {summary.pendingSosAlerts} PENDING SOS
            </Badge>
          ) : (
            <Badge variant="outline" className="px-3 py-1 text-green-400 border-green-400/30 bg-green-400/10">
              ALL SYSTEMS NORMAL
            </Badge>
          )}
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Active Fleet" 
          value={`${summary?.activeDevices || 0} / ${summary?.totalDevices || 0}`}
          icon={<RadioReceiver className="w-4 h-4" />}
          description={`${summary?.offlineDevices || 0} offline nodes`}
        />
        <StatsCard 
          title="SOS Alerts" 
          value={summary?.pendingSosAlerts || 0}
          icon={<AlertTriangle className="w-4 h-4" />}
          pulse={!!summary?.pendingSosAlerts && summary.pendingSosAlerts > 0}
          description="Needs immediate action"
          className={summary?.pendingSosAlerts ? "border-destructive shadow-[0_0_15px_rgba(255,0,60,0.2)]" : ""}
        />
        <StatsCard 
          title="Active Campaigns" 
          value={summary?.activeCampaigns || 0}
          icon={<Presentation className="w-4 h-4" />}
          description={`out of ${summary?.totalCampaigns || 0} total`}
        />
        <StatsCard 
          title="Total Impressions" 
          value={formatNumber(summary?.totalImpressionsDelivered)}
          icon={<Eye className="w-4 h-4" />}
          description={`${Math.round(((summary?.totalImpressionsDelivered || 0) / Math.max(summary?.totalImpressionsTarget || 1, 1)) * 100)}% of target`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>LIVE FLEET MAP</CardTitle>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Active</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-gray-500"></span> Standby/Offline</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-destructive animate-pulse"></span> SOS</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 px-6 pb-6">
            <FleetMap devices={devices || []} />
          </CardContent>
        </Card>

        {/* Impression Chart */}
        <Card>
          <CardHeader>
            <CardTitle>IMPRESSION PACING</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              {timeline && timeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "var(--font-mono)" }}
                      tickFormatter={(val) => {
                        const date = new Date(val)
                        return `${date.getDate()}/${date.getMonth() + 1}`
                      }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "var(--font-mono)" }}
                      tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}
                    />
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", fontFamily: "var(--font-mono)" }}
                      itemStyle={{ color: "hsl(var(--primary))" }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="impressions" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorImpressions)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground font-mono text-sm border border-dashed border-border rounded-md">
                  AWAITING TELEMETRY...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Device Cards Grid */}
      <div>
        <h2 className="text-xl font-heading font-bold tracking-widest text-primary mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_hsl(var(--primary))]"></span> 
          NODE STATUS STREAM
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {devices?.slice(0, 12).map((device) => (
            <Card key={device.id} className={`border-l-4 ${device.hasSosAlert ? 'border-l-destructive shadow-[0_0_10px_rgba(255,0,60,0.15)] bg-destructive/5' : device.screenStatus === 'ACTIVE' ? 'border-l-green-500' : 'border-l-muted'}`}>
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-heading font-bold tracking-wider">{device.nodeCode}</span>
                  <Badge variant={device.hasSosAlert ? "destructive" : device.screenStatus === "ACTIVE" ? "active" : "standby"}>
                    {device.hasSosAlert ? "SOS" : device.screenStatus}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Battery className={`w-3 h-3 ${device.batteryPct < 20 ? 'text-destructive' : 'text-primary'}`} />
                    {device.batteryPct}%
                    {device.isCharging && <Zap className="w-3 h-3 text-yellow-500" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Signal className="w-3 h-3 text-primary" />
                    {device.signalDbm} dBm
                  </div>
                </div>

                <div className="text-xs font-mono truncate">
                  <span className="text-muted-foreground">PLAYING: </span>
                  <span className="text-primary">{device.currentlyPlaying || "—"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

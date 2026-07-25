import { useState } from "react"
import { useListDevices, getListDevicesQueryKey, Device } from "@workspace/api-client-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Battery, Signal, Zap, AlertTriangle, MonitorPlay, WifiOff } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

function SignalBars({ dbm }: { dbm: number }) {
  // -50 excellent, -110 poor
  let bars = 1
  if (dbm >= -60) bars = 4
  else if (dbm >= -80) bars = 3
  else if (dbm >= -100) bars = 2

  return (
    <div className="flex items-end gap-[2px] h-4">
      {[1, 2, 3, 4].map(i => (
        <div 
          key={i} 
          className={`w-1.5 rounded-t-[1px] ${i <= bars ? 'bg-primary' : 'bg-primary/20'} ${i === 1 ? 'h-1.5' : i === 2 ? 'h-2.5' : i === 3 ? 'h-3.5' : 'h-4'}`}
        />
      ))}
      <span className="text-[10px] ml-1 text-muted-foreground">{dbm}</span>
    </div>
  )
}

function BatteryIndicator({ pct, charging }: { pct: number, charging: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative w-6 h-3 border border-muted-foreground rounded-[2px] p-[1px] flex items-center">
        <div className={`h-full rounded-[1px] ${pct < 20 ? 'bg-destructive' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-0.5 h-1.5 bg-muted-foreground rounded-r-[1px]" />
      </div>
      <span className="text-xs w-8">{pct}%</span>
      {charging && <Zap className="w-3 h-3 text-yellow-500" />}
    </div>
  )
}

export function Fleet() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  
  const queryParams = statusFilter !== "ALL" ? { status: statusFilter as any } : undefined
  const { data: devices, isLoading } = useListDevices(queryParams, { query: { queryKey: getListDevicesQueryKey(queryParams), refetchInterval: 30000 } })

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-widest text-primary">FLEET MANAGEMENT</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Real-time status of all DOOH nodes</p>
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="ALL">ALL NODES</TabsTrigger>
            <TabsTrigger value="ACTIVE" className="data-[state=active]:text-green-400">ACTIVE</TabsTrigger>
            <TabsTrigger value="STANDBY" className="data-[state=active]:text-yellow-400">STANDBY</TabsTrigger>
            <TabsTrigger value="OFFLINE" className="data-[state=active]:text-muted-foreground">OFFLINE</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="py-4 border-b border-border/50">
          <CardTitle>DEVICE INVENTORY</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-auto">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-12 bg-muted/30 animate-pulse rounded-md" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/20 sticky top-0 backdrop-blur-sm z-10">
                <TableRow>
                  <TableHead>NODE ID</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>BATTERY</TableHead>
                  <TableHead>SIGNAL</TableHead>
                  <TableHead>PLAYING</TableHead>
                  <TableHead>LAST PING</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices?.map((device) => (
                  <TableRow 
                    key={device.id} 
                    className={`cursor-pointer hover:bg-primary/5 ${device.hasSosAlert ? 'bg-destructive/10 hover:bg-destructive/20' : ''}`}
                    onClick={() => setSelectedDevice(device)}
                  >
                    <TableCell className="font-heading font-bold text-base">
                      <div className="flex items-center gap-2">
                        {device.hasSosAlert && <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />}
                        {device.nodeCode}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={device.screenStatus === "ACTIVE" ? "active" : device.screenStatus === "STANDBY" ? "standby" : "offline"}>
                        {device.screenStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <BatteryIndicator pct={device.batteryPct} charging={device.isCharging} />
                    </TableCell>
                    <TableCell>
                      <SignalBars dbm={device.signalDbm} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-primary/80">
                      {device.currentlyPlaying || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDateTime(device.lastPing)}
                    </TableCell>
                  </TableRow>
                ))}
                {devices?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No devices found matching criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedDevice} onOpenChange={(o) => !o && setSelectedDevice(null)}>
        <DialogContent>
          {selectedDevice && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-8">
                  <DialogTitle className="text-2xl">{selectedDevice.nodeCode}</DialogTitle>
                  <Badge variant={selectedDevice.screenStatus === "ACTIVE" ? "active" : selectedDevice.screenStatus === "STANDBY" ? "standby" : "offline"}>
                    {selectedDevice.screenStatus}
                  </Badge>
                </div>
                <DialogDescription>Firmware: {selectedDevice.firmwareVersion}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 py-4 font-mono text-sm">
                <div className="space-y-4">
                  <div>
                    <div className="text-muted-foreground mb-1 uppercase text-xs">Battery Status</div>
                    <BatteryIndicator pct={selectedDevice.batteryPct} charging={selectedDevice.isCharging} />
                    <div className="mt-1 text-xs text-primary/70">{selectedDevice.chargingModeStatus.replace(/_/g, ' ')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1 uppercase text-xs">Network</div>
                    <SignalBars dbm={selectedDevice.signalDbm} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-muted-foreground mb-1 uppercase text-xs">Currently Playing</div>
                    <div className="flex items-start gap-2">
                      <MonitorPlay className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-primary break-words leading-tight">{selectedDevice.currentlyPlaying || "None"}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground mb-1 uppercase text-xs">Location</div>
                    <div>{selectedDevice.currentLat.toFixed(5)}, {selectedDevice.currentLng.toFixed(5)}</div>
                  </div>
                </div>
              </div>

              {selectedDevice.hasSosAlert && (
                <div className="bg-destructive/20 border border-destructive p-3 rounded-md flex items-start gap-3 mt-2">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 animate-pulse" />
                  <div>
                    <div className="font-bold text-destructive">ACTIVE SOS ALERT</div>
                    <div className="text-xs font-mono text-destructive-foreground">Check SOS Dashboard to resolve.</div>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

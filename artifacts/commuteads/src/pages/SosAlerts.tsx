import { useState } from "react"
import { useListSosAlerts, getListSosAlertsQueryKey, useResolveSosAlert } from "@workspace/api-client-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/utils"
import { AlertTriangle, MapPin, CheckSquare, ShieldAlert, Siren, Flame, Stethoscope } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"

const getAlertConfig = (type: string) => {
  switch(type) {
    case 'WOMENS_SAFETY':
      return { color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/50', icon: ShieldAlert, label: 'WOMENS SAFETY' }
    case 'POLICE':
      return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/50', icon: Siren, label: 'POLICE' }
    case 'FIRE':
      return { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/50', icon: Flame, label: 'FIRE' }
    case 'AMBULANCE':
      return { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/50', icon: Stethoscope, label: 'AMBULANCE' }
    default:
      return { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/50', icon: AlertTriangle, label: type }
  }
}

export function SosAlerts() {
  const [statusFilter, setStatusFilter] = useState<string>("PENDING")
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const queryParams = statusFilter !== "ALL" ? { status: statusFilter as any } : undefined
  const { data: alerts, isLoading } = useListSosAlerts(queryParams, { query: { queryKey: getListSosAlertsQueryKey(queryParams), refetchInterval: 10000 } })

  const resolveMutation = useResolveSosAlert({
    mutation: {
      onSuccess: () => {
        toast({ title: "Alert Resolved", description: "Emergency cleared." })
        queryClient.invalidateQueries({ queryKey: getListSosAlertsQueryKey() })
      }
    }
  })

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-widest text-primary">SOS RESPONSE CENTER</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Passenger emergency triggers</p>
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="ALL">ALL ALERTS</TabsTrigger>
            <TabsTrigger value="PENDING" className="data-[state=active]:text-destructive data-[state=active]:animate-pulse">ACTIVE / PENDING</TabsTrigger>
            <TabsTrigger value="RESOLVED" className="data-[state=active]:text-green-400">RESOLVED</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 border-destructive/30">
        <CardHeader className="py-4 border-b border-border/50">
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> INCIDENT LOG</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-auto">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-muted/30 animate-pulse rounded-md" />)}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/20 sticky top-0 backdrop-blur-sm z-10">
                <TableRow>
                  <TableHead>TYPE</TableHead>
                  <TableHead>NODE CODE</TableHead>
                  <TableHead>LOCATION</TableHead>
                  <TableHead>TIMESTAMP</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead className="text-right">ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts?.map((alert) => {
                  const conf = getAlertConfig(alert.alertType)
                  const Icon = conf.icon
                  const isPending = alert.status === "PENDING"
                  return (
                    <TableRow key={alert.id} className={isPending ? `${conf.bg} hover:${conf.bg} border-b-${conf.border}` : ""}>
                      <TableCell>
                        <div className={`flex items-center gap-2 font-heading font-bold text-lg ${conf.color} ${isPending ? 'animate-pulse' : ''}`}>
                          <Icon className="w-5 h-5" />
                          {conf.label}
                        </div>
                      </TableCell>
                      <TableCell className="font-heading font-bold text-base">
                        {alert.nodeCode || `DEV-${alert.deviceId}`}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {formatDateTime(alert.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isPending ? "destructive" : "outline"} className={isPending ? "animate-pulse" : "text-green-400 border-green-400/30"}>
                          {alert.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {isPending && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-green-500/50 text-green-400 hover:bg-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]"
                            onClick={() => resolveMutation.mutate({ id: alert.id })}
                            disabled={resolveMutation.isPending}
                          >
                            <CheckSquare className="w-4 h-4 mr-2" /> MARK RESOLVED
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {alerts?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-mono">
                      No alerts matching criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import { useState } from "react"
import { useListCampaigns, getListCampaignsQueryKey, useApproveCampaign, useCreateCampaign } from "@workspace/api-client-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateTime, formatNumber } from "@/lib/utils"
import { CheckCircle2, Plus, Clock, LayoutList } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"

function PacingBar({ delivered, target, endDate }: { delivered: number, target: number, endDate: string }) {
  const pct = Math.min(100, Math.round((delivered / Math.max(target, 1)) * 100))
  let color = "bg-green-500"
  if (pct < 50) color = "bg-destructive"
  else if (pct < 80) color = "bg-yellow-500"

  const remainingMs = new Date(endDate).getTime() - new Date().getTime()
  const daysRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)))

  return (
    <div className="w-full min-w-[120px]">
      <div className="flex justify-between text-xs mb-1">
        <span className="font-mono text-muted-foreground">{pct}%</span>
        <span className="font-mono text-muted-foreground">{daysRemaining}d left</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function Campaigns() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const queryParams = statusFilter !== "ALL" ? { status: statusFilter as any } : undefined
  const { data: campaigns, isLoading } = useListCampaigns(queryParams, { query: { queryKey: getListCampaignsQueryKey(queryParams) } })
  const approveMutation = useApproveCampaign({
    mutation: {
      onSuccess: () => {
        toast({ title: "Campaign Approved", description: "The campaign is now ACTIVE." })
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() })
      }
    }
  })

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-widest text-primary">CAMPAIGN HUB</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Ad delivery pacing and approvals</p>
        </div>
        <div className="flex items-center gap-4">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="ALL">ALL</TabsTrigger>
              <TabsTrigger value="ACTIVE" className="data-[state=active]:text-green-400">ACTIVE</TabsTrigger>
              <TabsTrigger value="PENDING" className="data-[state=active]:text-yellow-400">PENDING</TabsTrigger>
              <TabsTrigger value="COMPLETED" className="data-[state=active]:text-muted-foreground">COMPLETED</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="py-4 border-b border-border/50 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><LayoutList className="w-5 h-5" /> CAMPAIGN LIST</CardTitle>
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
                  <TableHead>CAMPAIGN NAME</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>IMPRESSIONS</TableHead>
                  <TableHead>PACING</TableHead>
                  <TableHead>TIMEFRAME</TableHead>
                  <TableHead className="text-right">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-heading font-bold text-base">
                      {c.name}
                      <div className="text-xs font-mono font-normal text-muted-foreground">ADV-{c.advertiserId} • TIER: {c.targetFleetTier}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "ACTIVE" ? "active" : c.status === "PENDING" ? "standby" : "offline"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      <div>{formatNumber(c.deliveredImpressions)}</div>
                      <div className="text-xs text-muted-foreground">of {formatNumber(c.totalTargetImpressions)}</div>
                    </TableCell>
                    <TableCell>
                      {c.status === "PENDING" ? (
                        <span className="text-muted-foreground text-xs font-mono italic">Awaiting Approval</span>
                      ) : (
                        <PacingBar delivered={c.deliveredImpressions} target={c.totalTargetImpressions} endDate={c.endDate} />
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      <div>{formatDateTime(c.startDate)}</div>
                      <div>to {formatDateTime(c.endDate)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === "PENDING" && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                          onClick={() => approveMutation.mutate({ id: c.id })}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" /> APPROVE
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {campaigns?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      No campaigns found.
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

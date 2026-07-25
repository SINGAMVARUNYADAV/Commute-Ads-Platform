import { useState } from "react"
import { useListAdAssets, getListAdAssetsQueryKey, useApproveAdAsset } from "@workspace/api-client-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileVideo, CheckCircle2, PlayCircle, Clock } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"

export function AdAssets() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const { data: assets, isLoading } = useListAdAssets(undefined, { query: { queryKey: getListAdAssetsQueryKey() } })
  const approveMutation = useApproveAdAsset({
    mutation: {
      onSuccess: () => {
        toast({ title: "Asset Approved", description: "Creative is now eligible for playback." })
        queryClient.invalidateQueries({ queryKey: getListAdAssetsQueryKey() })
      }
    }
  })

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-widest text-primary">AD MODERATION</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Review and approve video creatives</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="py-4 border-b border-border/50">
          <CardTitle className="flex items-center gap-2"><FileVideo className="w-5 h-5" /> ASSET INVENTORY</CardTitle>
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
                  <TableHead>CREATIVE</TableHead>
                  <TableHead>CAMPAIGN ID</TableHead>
                  <TableHead>DURATION</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead className="text-right">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets?.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-muted rounded flex items-center justify-center border border-border shrink-0">
                          <PlayCircle className="w-4 h-4 text-primary/50" />
                        </div>
                        <div>
                          <div className="font-heading font-bold text-base">{asset.title}</div>
                          <a href={asset.videoUrl} target="_blank" rel="noreferrer" className="text-xs font-mono text-primary/70 hover:underline truncate max-w-[200px] block">
                            {asset.videoUrl}
                          </a>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">CMP-{asset.campaignId}</TableCell>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {asset.durationSec}s
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={asset.isApproved ? "active" : "standby"}>
                        {asset.isApproved ? "APPROVED" : "PENDING"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!asset.isApproved && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                          onClick={() => approveMutation.mutate({ id: asset.id })}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" /> APPROVE
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {assets?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      No ad assets found.
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

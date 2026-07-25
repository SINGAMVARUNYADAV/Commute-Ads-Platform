import { useState } from "react"
import { useListCampaigns, getListCampaignsQueryKey, useCreateCampaign, useCreateAdAsset, getListAdAssetsQueryKey } from "@workspace/api-client-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useQueryClient } from "@tanstack/react-query"
import { formatNumber, formatDateTime } from "@/lib/utils"
import { Upload, PlusCircle, Activity } from "lucide-react"

export function Advertiser() {
  const advertiserId = 1 // Demo static ID
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: campaigns, isLoading } = useListCampaigns(undefined, { query: { queryKey: getListCampaignsQueryKey() } })
  const myCampaigns = campaigns?.filter(c => c.advertiserId === advertiserId) || []

  // Create Campaign Form
  const [name, setName] = useState("")
  const [tier, setTier] = useState("PREMIUM")
  const [target, setTarget] = useState("10000")
  const [daily, setDaily] = useState("1000")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")

  const createCampMutation = useCreateCampaign({
    mutation: {
      onSuccess: () => {
        toast({ title: "Campaign Created", description: "Awaiting admin approval." })
        setName(""); setStart(""); setEnd("")
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() })
      }
    }
  })

  const handleCreateCampaign = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !start || !end) return
    createCampMutation.mutate({
      data: {
        advertiserId,
        name,
        targetFleetTier: tier,
        totalTargetImpressions: parseInt(target),
        dailyCap: parseInt(daily),
        startDate: new Date(start).toISOString(),
        endDate: new Date(end).toISOString()
      }
    })
  }

  // Upload Asset Form
  const [assetTitle, setAssetTitle] = useState("")
  const [assetUrl, setAssetUrl] = useState("")
  const [assetCamp, setAssetCamp] = useState("")
  
  const createAssetMutation = useCreateAdAsset({
    mutation: {
      onSuccess: () => {
        toast({ title: "Asset Uploaded", description: "Sent to moderation." })
        setAssetTitle(""); setAssetUrl(""); setAssetCamp("")
        queryClient.invalidateQueries({ queryKey: getListAdAssetsQueryKey() })
      }
    }
  })

  const handleUploadAsset = (e: React.FormEvent) => {
    e.preventDefault()
    if (!assetTitle || !assetUrl || !assetCamp) return
    createAssetMutation.mutate({
      data: {
        campaignId: parseInt(assetCamp),
        title: assetTitle,
        videoUrl: assetUrl,
        durationSec: 15
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-widest text-primary">ADVERTISER PORTAL</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">Campaign creation and reporting</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4 border-b border-border/50 flex flex-row justify-between items-center">
              <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> MY CAMPAIGNS</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 space-y-4">
                  <div className="h-12 bg-muted/30 animate-pulse rounded-md" />
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/20">
                    <TableRow>
                      <TableHead>CAMPAIGN</TableHead>
                      <TableHead>STATUS</TableHead>
                      <TableHead>DELIVERY</TableHead>
                      <TableHead>TIMEFRAME</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myCampaigns.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-heading font-bold text-base">{c.name}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === "ACTIVE" ? "active" : c.status === "PENDING" ? "standby" : "offline"}>
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <div>{formatNumber(c.deliveredImpressions)} / {formatNumber(c.totalTargetImpressions)}</div>
                          <div className="w-full bg-muted h-1.5 mt-1 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${Math.min(100, (c.deliveredImpressions/Math.max(1,c.totalTargetImpressions))*100)}%` }} />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {formatDateTime(c.startDate).split(',')[0]} - {formatDateTime(c.endDate).split(',')[0]}
                        </TableCell>
                      </TableRow>
                    ))}
                    {myCampaigns.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-32 text-center text-muted-foreground font-mono">
                          You have no campaigns yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PlusCircle className="w-5 h-5" /> NEW CAMPAIGN</CardTitle>
              <CardDescription>Setup a new fleet ad campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">CAMPAIGN NAME</Label>
                  <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target">TARGET IMPR.</Label>
                    <Input id="target" type="number" value={target} onChange={e => setTarget(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="daily">DAILY CAP</Label>
                    <Input id="daily" type="number" value={daily} onChange={e => setDaily(e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start">START DATE</Label>
                    <Input id="start" type="date" value={start} onChange={e => setStart(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">END DATE</Label>
                    <Input id="end" type="date" value={end} onChange={e => setEnd(e.target.value)} required />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={createCampMutation.isPending}>
                  SUBMIT FOR APPROVAL
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> UPLOAD CREATIVE</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUploadAsset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign">SELECT CAMPAIGN</Label>
                  <select 
                    id="campaign" 
                    value={assetCamp} 
                    onChange={e => setAssetCamp(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-mono"
                    required
                  >
                    <option value="">-- Choose Campaign --</option>
                    {myCampaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">CREATIVE TITLE</Label>
                  <Input id="title" value={assetTitle} onChange={e => setAssetTitle(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">VIDEO URL</Label>
                  <Input id="url" type="url" value={assetUrl} onChange={e => setAssetUrl(e.target.value)} placeholder="https://..." required />
                </div>
                <Button type="submit" variant="secondary" className="w-full" disabled={createAssetMutation.isPending}>
                  UPLOAD ASSET
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

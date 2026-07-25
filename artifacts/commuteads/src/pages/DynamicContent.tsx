import { useState } from "react"
import { useListDynamicContent, getListDynamicContentQueryKey, useDeleteDynamicContent, usePushBreakingNews } from "@workspace/api-client-react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDateTime } from "@/lib/utils"
import { useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { Trash2, Radio, MapPin, MonitorPlay, AlertTriangle } from "lucide-react"

export function DynamicContent() {
  const [contentType, setContentType] = useState<string>("WEATHER_CARD")
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const queryParams = contentType !== "ALL" ? { content_type: contentType as any } : undefined
  const { data: contents, isLoading } = useListDynamicContent(queryParams, { query: { queryKey: getListDynamicContentQueryKey(queryParams) } })

  const deleteMutation = useDeleteDynamicContent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Content Deleted", description: "Removed from active rotation." })
        queryClient.invalidateQueries({ queryKey: getListDynamicContentQueryKey() })
      }
    }
  })

  // Breaking News Form State
  const [newsHeadline, setNewsHeadline] = useState("")
  const [newsBody, setNewsBody] = useState("")
  const pushNewsMutation = usePushBreakingNews({
    mutation: {
      onSuccess: () => {
        toast({ title: "ALERT BROADCASTED", description: "Breaking news pushed to all nodes.", variant: "destructive" })
        setNewsHeadline("")
        setNewsBody("")
        queryClient.invalidateQueries({ queryKey: getListDynamicContentQueryKey() })
      }
    }
  })

  const handlePushNews = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newsHeadline || !newsBody) return
    pushNewsMutation.mutate({ data: { headline: newsHeadline, bodyText: newsBody, locationTag: "GLOBAL" } })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-widest text-primary">CONTENT MANAGER</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Manage passenger experience cards</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={contentType} onValueChange={setContentType}>
            <TabsList className="bg-card border border-border grid grid-cols-4 h-auto p-1">
              <TabsTrigger value="WEATHER_CARD" className="py-2">WEATHER</TabsTrigger>
              <TabsTrigger value="NEWS_CARD" className="py-2">NEWS</TabsTrigger>
              <TabsTrigger value="MEME" className="py-2">MEMES</TabsTrigger>
              <TabsTrigger value="BREAKING_ALERT" className="py-2 data-[state=active]:text-destructive">ALERTS</TabsTrigger>
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-48 bg-card animate-pulse rounded-lg border border-border" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contents?.map((item) => (
                <Card key={item.id} className={item.contentType === 'BREAKING_ALERT' ? 'border-destructive bg-destructive/5 shadow-[0_0_15px_rgba(255,0,60,0.1)]' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl leading-tight">{item.headline}</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => deleteMutation.mutate({ id: item.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-sm text-foreground/80 mb-4">{item.bodyText}</p>
                    <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.locationTag}</span>
                      <span className="flex items-center gap-1">Valid till: {formatDateTime(item.validUntil)}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {contents?.length === 0 && (
                <div className="col-span-full h-32 flex flex-col items-center justify-center text-muted-foreground font-mono text-sm border border-dashed border-border rounded-lg">
                  <MonitorPlay className="w-6 h-6 mb-2 opacity-50" />
                  NO ACTIVE {contentType.replace('_', ' ')} CONTENT
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <Card className="border-destructive shadow-[0_0_20px_rgba(255,0,60,0.15)] bg-destructive/5 sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5 animate-pulse" /> OVERRIDE BROADCAST
              </CardTitle>
              <CardDescription className="text-destructive/70 font-mono">Push emergency alerts to all screens immediately, interrupting ads.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePushNews} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="headline" className="text-destructive">HEADLINE (CAPS)</Label>
                  <Input 
                    id="headline" 
                    value={newsHeadline} 
                    onChange={e => setNewsHeadline(e.target.value)} 
                    placeholder="e.g. HEAVY RAIN WARNING"
                    className="border-destructive/30 focus-visible:ring-destructive font-bold text-lg"
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body" className="text-destructive">MESSAGE BODY</Label>
                  <textarea 
                    id="body" 
                    value={newsBody} 
                    onChange={e => setNewsBody(e.target.value)} 
                    placeholder="Provide detailed instructions for passengers..."
                    className="flex min-h-[100px] w-full rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 font-mono"
                    maxLength={200}
                  />
                </div>
                <Button 
                  type="submit" 
                  variant="destructive" 
                  className="w-full font-bold tracking-widest"
                  disabled={pushNewsMutation.isPending || !newsHeadline || !newsBody}
                >
                  <Radio className="w-4 h-4 mr-2" /> TRANSMIT TO FLEET
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

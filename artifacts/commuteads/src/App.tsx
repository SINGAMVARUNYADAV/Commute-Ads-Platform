import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Shell } from '@/components/layout/Shell';

// Pages
import { Dashboard } from '@/pages/Dashboard';
import { Fleet } from '@/pages/Fleet';
import { Campaigns } from '@/pages/Campaigns';
import { AdAssets } from '@/pages/AdAssets';
import { DynamicContent } from '@/pages/DynamicContent';
import { SosAlerts } from '@/pages/SosAlerts';
import { Advertiser } from '@/pages/Advertiser';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/fleet" component={Fleet} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/ad-assets" component={AdAssets} />
        <Route path="/content" component={DynamicContent} />
        <Route path="/sos" component={SosAlerts} />
        <Route path="/advertiser" component={Advertiser} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

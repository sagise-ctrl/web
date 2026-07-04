import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import OrderPage from "@/pages/order";
import TrackPage from "@/pages/track";
import AdminPage from "@/pages/admin";
import TermsPage from "@/pages/terms";
import PaymentFinishPage from "@/pages/payment-finish";
import RegisterUserPage from "@/pages/register-user";
import LoginUserPage from "@/pages/login-user";
import AkunPage from "@/pages/akun";
import RegisterAffiliatePage from "@/pages/register-affiliate";
import LoginAffiliatePage from "@/pages/login-affiliate";
import AffiliatePage from "@/pages/affiliate";

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
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/order" component={OrderPage} />
      <Route path="/track" component={TrackPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/payment-finish" component={PaymentFinishPage} />
      <Route path="/register-user" component={RegisterUserPage} />
      <Route path="/login-user" component={LoginUserPage} />
      <Route path="/akun" component={AkunPage} />
      <Route path="/register-affiliate" component={RegisterAffiliatePage} />
      <Route path="/login-affiliate" component={LoginAffiliatePage} />
      <Route path="/affiliate" component={AffiliatePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base="">
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

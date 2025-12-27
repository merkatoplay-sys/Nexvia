import { Switch, Route, useLocation } from "wouter";
import { StreamingProvider } from "@/context/StreamingContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import AccountDetail from "@/pages/AccountDetail";
import Sales from "@/pages/Sales";
import Finances from "@/pages/Finances";
import Renovaciones from "@/pages/Renovaciones";
import Services from "@/pages/Services";
import Profiles from "@/pages/Profiles";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import AppLayout from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;
  return <Component {...rest} />;
}

function Router() {
  const { isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated && location !== "/login") {
      setLocation("/login");
    }
    if (isAuthenticated && location === "/login") {
      setLocation("/");
    }
  }, [isAuthenticated, location, setLocation]);

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/login">{() => { setLocation("/"); return null; }}</Route>
        <Route path="/accounts" component={Accounts} />
        <Route path="/account/:id" component={AccountDetail} />
        <Route path="/sales" component={Sales} />
        <Route path="/profiles" component={Profiles} />
        <Route path="/finances" component={Finances} />
        <Route path="/renovaciones" component={Renovaciones} />
        <Route path="/services" component={Services} />
        <Route path="/settings" component={Settings} />
        <Route component={Dashboard} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StreamingProvider>
          <Toaster />
          <SonnerToaster 
            position="top-center" 
            richColors 
            theme="dark"
            toastOptions={{
              style: {
                background: '#1a1a2e',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
              },
            }}
          />
          <Router />
        </StreamingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

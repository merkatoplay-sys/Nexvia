import { Switch, Route, useLocation } from "wouter";
import { StreamingProvider } from "@/context/StreamingContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/toaster";
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
        <Route path="/accounts" component={Accounts} />
        <Route path="/account/:id" component={AccountDetail} />
        <Route path="/sales" component={Sales} />
        <Route path="/profiles" component={Profiles} />
        <Route path="/finances" component={Finances} />
        <Route path="/renovaciones" component={Renovaciones} />
        <Route path="/services" component={Services} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <StreamingProvider>
        <Toaster />
        <Router />
      </StreamingProvider>
    </AuthProvider>
  );
}

export default App;

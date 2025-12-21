import { Switch, Route } from "wouter";
import { StreamingProvider } from "@/context/StreamingContext";
import { Toaster } from "@/components/ui/toaster";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import AccountDetail from "@/pages/AccountDetail";
import Sales from "@/pages/Sales";
import Finances from "@/pages/Finances";
import Services from "@/pages/Services";
import AppLayout from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/accounts" component={Accounts} />
        <Route path="/account/:id" component={AccountDetail} />
        <Route path="/sales" component={Sales} />
        <Route path="/finances" component={Finances} />
        <Route path="/services" component={Services} />
        <Route path="/clients" component={() => <div className="text-white">Módulo de Clientes (Próximamente)</div>} />
        <Route path="/settings" component={() => <div className="text-white">Configuración (Próximamente)</div>} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <StreamingProvider>
      <Toaster />
      <Router />
    </StreamingProvider>
  );
}

export default App;

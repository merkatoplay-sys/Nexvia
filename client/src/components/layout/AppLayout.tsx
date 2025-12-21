import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Users, CreditCard, Settings, Menu, X, LogOut, MonitorPlay } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Cuentas', href: '/accounts', icon: MonitorPlay },
    { name: 'Ventas', href: '/sales', icon: Users },
    { name: 'Perfiles', href: '/profiles', icon: Users },
    { name: 'Servicios', href: '/services', icon: CreditCard },
    { name: 'Finanzas', href: '/finances', icon: CreditCard },
    { name: 'Configuración', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-card/90 backdrop-blur-xl border-r border-white/5 transition-transform duration-300 lg:translate-x-0 lg:relative",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-white/5">
            <MonitorPlay className="h-6 w-6 text-primary mr-2" />
            <span className="text-xl font-display font-bold tracking-wider text-white">STREAM<span className="text-primary">MGR</span></span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer group",
                      isActive 
                        ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_-3px_rgba(124,58,237,0.3)]" 
                        : "text-muted-foreground hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon className={cn("mr-3 h-5 w-5 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white")} />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/5">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-card/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 z-30">
          <div className="flex items-center">
            <MonitorPlay className="h-6 w-6 text-primary mr-2" />
            <span className="font-display font-bold text-white">STREAM<span className="text-primary">MGR</span></span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

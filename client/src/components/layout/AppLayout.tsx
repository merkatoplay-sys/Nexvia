import { Link, useLocation } from 'wouter';
import { LayoutDashboard, Users, CreditCard, Settings, Menu, X, LogOut, MonitorPlay, RotateCw, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, logout } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Cuentas', href: '/accounts', icon: MonitorPlay },
    { name: 'Ventas', href: '/sales', icon: Users },
    { name: 'Perfiles', href: '/profiles', icon: Users },
    { name: 'Servicios', href: '/services', icon: CreditCard },
    { name: 'Renovaciones', href: '/renovaciones', icon: RotateCw },
    { name: 'Finanzas', href: '/finances', icon: CreditCard },
    { name: 'Configuración', href: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      window.location.replace('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground overflow-hidden">
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside 
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-card/90 backdrop-blur-xl border-r border-white/5 transition-transform duration-300 lg:translate-x-0 lg:relative",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-white/5">
            <MonitorPlay className="h-6 w-6 text-primary mr-2" />
            <span className="text-xl font-display font-bold tracking-wider text-white">NEX<span className="text-primary">VIA</span></span>
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

          <div className="p-4 border-t border-white/5 space-y-3">
            {user && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
                    {user.email}
                  </p>
                </div>
              </div>
            )}
            <Button 
              variant="ghost" 
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowLogoutConfirm(true)}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="lg:hidden h-16 bg-card/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 z-30">
          <div className="flex items-center">
            <MonitorPlay className="h-6 w-6 text-primary mr-2" />
            <span className="font-display font-bold text-white">NEX<span className="text-primary">VIA</span></span>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <span className="text-xs text-muted-foreground hidden sm:block" data-testid="text-user-email-mobile">
                {user.email}
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {children}
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="¿Cerrar sesión?"
        description="Se cerrará tu sesión actual y serás redirigido a la página de inicio de sesión."
        confirmText="Cerrar Sesión"
        cancelText="Cancelar"
        variant="destructive"
        onConfirm={handleLogout}
      />
    </div>
  );
}

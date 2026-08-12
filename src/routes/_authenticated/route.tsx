import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import {
  LayoutDashboard,
  FolderKanban,
  Wallet,
  Gauge,
  LogOut,
  User2,
  LifeBuoy,
  Building2,
  FileText,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MobileOnboarding } from "@/components/MobileOnboarding";
import { NotificationsBell } from "@/components/NotificationsBell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Accueil" },
  { to: "/organisation", icon: Building2, label: "Organisation" },
  { to: "/projets", icon: FolderKanban, label: "Projets" },
  { to: "/finances", icon: Wallet, label: "Finances" },
  { to: "/documents", icon: FileText, label: "Documents" },
  { to: "/evaluation", icon: TrendingUp, label: "Maturité" },
  { to: "/score", icon: Gauge, label: "Score" },
  { to: "/coherence", icon: ShieldCheck, label: "Cohérence" },
  { to: "/accompagnement", icon: LifeBuoy, label: "Accompagnement" },

] as const;

function AuthLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const location = useLocation();

  async function logout() {
    await supabase.auth.signOut();
    toast.success("À bientôt !");
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-muted/30 md:flex">
      <aside className="hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/dashboard">
            <Logo className="h-10 w-auto" plus={false} />
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className="w-4 h-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <div className="flex min-w-0 items-center gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground">
                <User2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 truncate text-xs">{user.email}</div>
            </div>
            <NotificationsBell />
          </div>
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" /> Déconnexion
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-3 lg:hidden">
          <Logo className="h-7 w-auto" plus={false} />
          <div className="flex items-center gap-1">
            <NotificationsBell />
            <Button onClick={logout} variant="ghost" size="sm">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b bg-card px-2 py-2 lg:hidden">
          {NAV.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                className={`flex min-w-[68px] shrink-0 flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-semibold leading-tight ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="w-full truncate text-center">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1 overflow-x-clip overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <MobileOnboarding />
    </div>
  );
}

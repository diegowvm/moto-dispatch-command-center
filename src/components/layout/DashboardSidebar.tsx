import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  DollarSign, 
  MessageCircle, 
  Bell, 
  MapPin,
  Truck,
  LogOut,
  Settings
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Entregadores",
    url: "/dashboard/entregadores",
    icon: Users,
  },
  {
    title: "Pedidos",
    url: "/dashboard/pedidos",
    icon: Package,
  },
  {
    title: "Mapa",
    url: "/dashboard/mapa",
    icon: MapPin,
  },
];

const managementItems = [
  {
    title: "Financeiro",
    url: "/dashboard/financeiro",
    icon: DollarSign,
  },
  {
    title: "Suporte",
    url: "/dashboard/suporte",
    icon: MessageCircle,
  },
  {
    title: "Notificações",
    url: "/dashboard/notificacoes",
    icon: Bell,
  },
];

interface DashboardSidebarProps {
  onLogout: () => void;
}

export const DashboardSidebar = ({ onLogout }: DashboardSidebarProps) => {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  const getNavClassName = (path: string) => {
    return isActive(path)
      ? "bg-sidebar-accent text-sidebar-primary font-medium border-r-2 border-sidebar-primary"
      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary transition-all duration-200";
  };

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} bg-sidebar-background border-r border-sidebar-border`}>
      <SidebarContent className="bg-sidebar-background">
        {/* Logo */}
        <div className={`flex items-center p-4 ${collapsed ? "justify-center" : "justify-start"}`}>
          <div className="bg-sidebar-primary/10 p-2 rounded-lg">
            <Truck className="h-6 w-6 text-sidebar-primary" />
          </div>
          {!collapsed && (
            <div className="ml-3">
              <h1 className="text-lg font-bold text-sidebar-foreground">Logtech</h1>
              <p className="text-xs text-sidebar-foreground/70">Admin Dashboard</p>
            </div>
          )}
        </div>

        <Separator className="bg-sidebar-border" />

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs uppercase tracking-wide">
            {!collapsed && "Principal"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={`flex items-center w-full p-3 rounded-lg ${getNavClassName(item.url)}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span className="ml-3 text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs uppercase tracking-wide">
            {!collapsed && "Gestão"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={`flex items-center w-full p-3 rounded-lg ${getNavClassName(item.url)}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span className="ml-3 text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="bg-sidebar-background border-t border-sidebar-border p-4">
        <div className="space-y-2">
          {!collapsed && (
            <NavLink
              to="/dashboard/configuracoes"
              className="flex items-center w-full p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span className="ml-3 text-sm">Configurações</span>
            </NavLink>
          )}
          
          <Button
            onClick={onLogout}
            variant="ghost"
            size="sm"
            className={`w-full ${collapsed ? "px-2" : "justify-start"} text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive`}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-3">Sair</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
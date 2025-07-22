import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  Upload, 
  BarChart3, 
  Share2,
  Building2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    href: "/products",
    icon: ShoppingCart,
    label: "Products",
  },
  {
    href: "/documents",
    icon: FileText,
    label: "Documents",
  },
  {
    href: "/upload",
    icon: Upload,
    label: "Upload",
  },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [location] = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [collapsed]);

  return (
    <div className={cn(
      "bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className={cn(
            "flex items-center space-x-2 transition-opacity duration-300",
            collapsed ? "opacity-0" : "opacity-100"
          )}>
            <Building2 className="w-8 h-8 text-primary flex-shrink-0" />
            {!collapsed && (
              <span className="text-xl font-bold text-gray-900 whitespace-nowrap">BrochurePro</span>
            )}
          </div>
          {collapsed && (
            <div className="flex items-center justify-center w-full">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "p-1.5 transition-all duration-300",
              collapsed ? "ml-0" : "ml-auto"
            )}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={location === item.href ? "default" : "ghost"}
                className={cn(
                  "w-full transition-all duration-200 ease-in-out",
                  collapsed 
                    ? "justify-center px-2 h-12" 
                    : "justify-start px-4 h-10"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={cn(
                  "w-5 h-5 flex-shrink-0",
                  !collapsed && "mr-3"
                )} />
                <span className={cn(
                  "transition-all duration-300 whitespace-nowrap",
                  collapsed 
                    ? "opacity-0 w-0 overflow-hidden" 
                    : "opacity-100 w-auto"
                )}>
                  {item.label}
                </span>
              </Button>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
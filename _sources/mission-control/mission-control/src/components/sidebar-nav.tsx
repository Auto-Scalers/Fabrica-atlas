"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Grid2x2,
  Columns3,
  Target,
  Lightbulb,
  FolderOpen,
  Zap,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/priority-matrix", label: "Priority Matrix", icon: Grid2x2 },
  { href: "/status-board", label: "Status Board", icon: Columns3 },
  { href: "/objectives", label: "Objectives", icon: Target },
  { href: "/brain-dump", label: "Brain Dump", icon: Lightbulb },
  { href: "/ventures", label: "Ventures", icon: FolderOpen },
  { href: "/autopilot", label: "Autopilot", icon: Zap },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-full w-56 flex-col border-r bg-sidebar-background">
      <div className="flex h-14 items-center border-b px-4">
        <h1 className="text-lg font-bold text-sidebar-primary">Mission Control</h1>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

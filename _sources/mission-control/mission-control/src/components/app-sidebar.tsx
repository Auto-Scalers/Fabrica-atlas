"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Grid2x2,
  Columns3,
  Crosshair,
  Lightbulb,
  Rocket,
  Bot,
  Search,
  Code,
  Megaphone,
  BarChart3,
  User,
  Inbox,
  Activity,
  HelpCircle,
  X,
  Users,
  BookOpen,
  Zap,
  Shield,
  Wrench,
  Globe,
  Brain,
  Palette,
  HeartPulse,
  Flag,
  Radio,
  Lock,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarFooter } from "@/components/sidebar-footer";
import type { AgentDefinition } from "@/lib/types";

const mainLinks = [
  { href: "/", label: "Command Center", icon: LayoutDashboard },
  { href: "/objectives", label: "Objectives", icon: Crosshair },
  { href: "/ventures", label: "Ventures", icon: Sparkles },
  { href: "/brain-dump", label: "Brain Dump", icon: Lightbulb },
  { href: "/checkpoints", label: "Checkpoints", icon: Flag },
  { href: "/autopilot", label: "Autopilot", icon: Zap },
  { href: "/guide", label: "Guide", icon: BookOpen },
];

const taskLinks = [
  { href: "/priority-matrix", label: "Priority Matrix", icon: Grid2x2 },
  { href: "/status-board", label: "Status Board", icon: Columns3 },
];

const commsLinks = [
  { href: "/inbox", label: "Inbox", icon: Inbox, badgeKey: "unreadInbox" as const },
  { href: "/activity", label: "Activity", icon: Activity, badgeKey: null },
  { href: "/decisions", label: "Decisions", icon: HelpCircle, badgeKey: "pendingDecisions" as const },
];

const fieldOpsLinks = [
  { href: "/field-ops", label: "Dashboard", icon: Radio },
  { href: "/field-ops/missions", label: "Missions", icon: Rocket },
  { href: "/field-ops/services", label: "Services", icon: Globe },
  { href: "/field-ops/vault", label: "Vault", icon: Lock },
  { href: "/field-ops/safety", label: "Safety", icon: Shield },
  { href: "/field-ops/activity", label: "Activity", icon: KeyRound },
];

// Dynamic icon lookup by name
const iconMap: Record<string, typeof User> = {
  User, Search, Code, Megaphone, BarChart3, Bot, Zap,
  Shield, Wrench, BookOpen, Globe, Brain, Palette, HeartPulse,
};

function getAgentIcon(iconName: string) {
  return iconMap[iconName] ?? Bot;
}

interface AppSidebarProps {
  collapsed: boolean;
  unreadInbox?: number;
  pendingDecisions?: number;
  pendingFieldApprovals?: number;
  isMobile?: boolean;
  onClose?: () => void;
  agents?: AgentDefinition[];
}

export function AppSidebar({ collapsed, unreadInbox = 0, pendingDecisions = 0, pendingFieldApprovals = 0, isMobile = false, onClose, agents = [] }: AppSidebarProps) {
  const pathname = usePathname();
  const badges = { unreadInbox, pendingDecisions };

  const activeAgents = agents.filter((a) => a.status === "active");

  // On mobile: render as full-height overlay drawer (always expanded)
  if (isMobile) {
    return (
      <TooltipProvider delayDuration={0}>
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-sidebar-background shadow-2xl transition-transform duration-200",
            collapsed ? "-translate-x-full" : "translate-x-0"
          )}
        >
          {/* Mobile close button */}
          <div className="flex h-14 items-center justify-between border-b px-4">
            <span className="text-sm font-semibold">Mission Control</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0" aria-label="Close sidebar">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="flex-1">
            {/* Main Navigation */}
            <nav className="space-y-0.5 p-2">
              {mainLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Tasks */}
            <Separator className="mx-2 my-2" />
            <div className="px-3 pb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Tasks
              </p>
            </div>
            <nav className="space-y-0.5 px-2">
              {taskLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Field Ops */}
            <Separator className="mx-2 my-2" />
            <div className="px-3 pb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Field Ops
              </p>
            </div>
            <nav className="space-y-0.5 px-2">
              {fieldOpsLinks.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || (href !== "/field-ops" && pathname.startsWith(href));
                const showFieldBadge = href === "/field-ops" && pendingFieldApprovals > 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {showFieldBadge && (
                      <Badge className="h-5 min-w-5 justify-center px-1.5 text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        {pendingFieldApprovals}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Communications */}
            <Separator className="mx-2 my-2" />
            <div className="px-3 pb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Comms
              </p>
            </div>
            <nav className="space-y-0.5 px-2">
              {commsLinks.map(({ href, label, icon: Icon, badgeKey }) => {
                const isActive = pathname === href || pathname.startsWith(href + "/");
                const count = badgeKey ? badges[badgeKey] : 0;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {count > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-5 justify-center px-1.5 text-xs">
                        {count}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Crew */}
            <Separator className="mx-2 my-2" />
            <div className="px-3 pb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Crew
              </p>
            </div>
            <div className="space-y-0.5 px-2">
              {/* Crew overview link */}
              <Link
                href="/crew"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  pathname === "/crew" || pathname.startsWith("/crew/")
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-xs font-medium">All Agents</span>
              </Link>
              {/* Dynamic agent list */}
              {activeAgents.map((agent) => {
                const Icon = getAgentIcon(agent.icon);
                const isActive = pathname === `/team/${agent.id}`;
                return (
                  <Link
                    key={agent.id}
                    href={`/team/${agent.id}`}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate text-xs">{agent.name}</span>
                  </Link>
                );
              })}
              {/* Skills library link */}
              <Link
                href="/skills"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  pathname === "/skills" || pathname.startsWith("/skills/")
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-xs font-medium">Skills Library</span>
              </Link>
            </div>

          </ScrollArea>

          {/* Footer */}
          <SidebarFooter collapsed={false} />
        </aside>
      </TooltipProvider>
    );
  }

  // Desktop: original sidebar behavior
  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-14 z-30 flex h-[calc(100vh-3.5rem)] flex-col border-r bg-sidebar-background transition-all duration-200",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <ScrollArea className="flex-1">
          {/* Main Navigation */}
          <nav className="space-y-0.5 p-2">
            {mainLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
              const link = (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={href}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{label}</TooltipContent>
                  </Tooltip>
                );
              }
              return link;
            })}
          </nav>

          {/* Tasks */}
          <Separator className="mx-2 my-2" />
          {!collapsed && (
            <div className="px-3 pb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Tasks
              </p>
            </div>
          )}
          <nav className="space-y-0.5 px-2">
            {taskLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              const link = (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={href}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{label}</TooltipContent>
                  </Tooltip>
                );
              }
              return link;
            })}
          </nav>

          {/* Field Ops */}
          <Separator className="mx-2 my-2" />
          {!collapsed && (
            <div className="px-3 pb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Field Ops
              </p>
            </div>
          )}
          <nav className="space-y-0.5 px-2">
            {fieldOpsLinks.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== "/field-ops" && pathname.startsWith(href));
              const showFieldBadge = href === "/field-ops" && pendingFieldApprovals > 0;
              const link = (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{label}</span>
                      {showFieldBadge && (
                        <Badge className="h-5 min-w-5 justify-center px-1.5 text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          {pendingFieldApprovals}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={href}>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        {link}
                        {showFieldBadge && (
                          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {label}
                      {showFieldBadge && ` (${pendingFieldApprovals} pending)`}
                    </TooltipContent>
                  </Tooltip>
                );
              }
              return link;
            })}
          </nav>

          {/* Communications */}
          <Separator className="mx-2 my-2" />
          {!collapsed && (
            <div className="px-3 pb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Comms
              </p>
            </div>
          )}
          <nav className="space-y-0.5 px-2">
            {commsLinks.map(({ href, label, icon: Icon, badgeKey }) => {
              const isActive = pathname === href || pathname.startsWith(href + "/");
              const count = badgeKey ? badges[badgeKey] : 0;
              const link = (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{label}</span>
                      {count > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 justify-center px-1.5 text-xs">
                          {count}
                        </Badge>
                      )}
                    </>
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={href}>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        {link}
                        {count > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {label}
                      {count > 0 && ` (${count})`}
                    </TooltipContent>
                  </Tooltip>
                );
              }
              return link;
            })}
          </nav>

          {/* Crew */}
          <Separator className="mx-2 my-2" />
          {!collapsed && (
            <div className="px-3 pb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Crew
              </p>
            </div>
          )}
          <div className="space-y-0.5 px-2">
            {/* Crew overview link */}
            {(() => {
              const isActive = pathname === "/crew" || pathname.startsWith("/crew/");
              const link = (
                <Link
                  key="crew-overview"
                  href="/crew"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  {!collapsed && <span className="truncate text-xs font-medium">All Agents</span>}
                </Link>
              );
              if (collapsed) {
                return (
                  <Tooltip key="crew-overview">
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">All Agents</TooltipContent>
                  </Tooltip>
                );
              }
              return link;
            })()}
            {/* Dynamic agent list */}
            {activeAgents.map((agent) => {
              const Icon = getAgentIcon(agent.icon);
              const isActive = pathname === `/team/${agent.id}`;
              const link = (
                <Link
                  key={agent.id}
                  href={`/team/${agent.id}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {!collapsed && (
                    <span className="truncate text-xs">{agent.name}</span>
                  )}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={agent.id}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.description}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }
              return link;
            })}
            {/* Skills library link */}
            {(() => {
              const isActive = pathname === "/skills" || pathname.startsWith("/skills/");
              const link = (
                <Link
                  key="skills-library"
                  href="/skills"
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  {!collapsed && <span className="truncate text-xs font-medium">Skills Library</span>}
                </Link>
              );
              if (collapsed) {
                return (
                  <Tooltip key="skills-library">
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">Skills Library</TooltipContent>
                  </Tooltip>
                );
              }
              return link;
            })()}
          </div>

        </ScrollArea>

        {/* Footer */}
        <SidebarFooter collapsed={collapsed} />
      </aside>
    </TooltipProvider>
  );
}

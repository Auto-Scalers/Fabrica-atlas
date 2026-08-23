"use client";

import Link from "next/link";
import { ChevronRight, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function BreadcrumbNav({ items, className }: BreadcrumbNavProps) {
  return (
    <nav className={cn("flex items-center gap-1.5 text-sm", className)} aria-label="Breadcrumb">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <LayoutDashboard className="h-4 w-4" />
        <span>Command Center</span>
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          {item.href ? (
            <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

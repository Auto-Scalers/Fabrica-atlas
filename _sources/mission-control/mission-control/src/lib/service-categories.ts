import {
  Hash,
  Mail,
  Tv,
  Palette,
  ShoppingCart,
  BarChart3,
  Users,
  FolderKanban,
  Cloud,
  HardDrive,
  Megaphone,
  Headphones,
  Calendar,
  Search,
  FileText,
  Cpu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ServiceCategory } from "./types";

export interface CategoryInfo {
  id: ServiceCategory;
  label: string;
  icon: LucideIcon;
  color: string;
}

export const SERVICE_CATEGORIES: CategoryInfo[] = [
  { id: "social-media", label: "Social Media", icon: Hash, color: "bg-blue-500/20 text-blue-400" },
  { id: "email-communication", label: "Email & Communication", icon: Mail, color: "bg-indigo-500/20 text-indigo-400" },
  { id: "content-publishing", label: "Content & Publishing", icon: Tv, color: "bg-purple-500/20 text-purple-400" },
  { id: "design-creative", label: "Design & Creative", icon: Palette, color: "bg-pink-500/20 text-pink-400" },
  { id: "ecommerce-payments", label: "E-Commerce & Payments", icon: ShoppingCart, color: "bg-emerald-500/20 text-emerald-400" },
  { id: "analytics-seo", label: "Analytics & SEO", icon: BarChart3, color: "bg-yellow-500/20 text-yellow-400" },
  { id: "crm-sales", label: "CRM & Sales", icon: Users, color: "bg-orange-500/20 text-orange-400" },
  { id: "project-management", label: "Project Management", icon: FolderKanban, color: "bg-cyan-500/20 text-cyan-400" },
  { id: "cloud-hosting", label: "Cloud & Hosting", icon: Cloud, color: "bg-sky-500/20 text-sky-400" },
  { id: "file-storage", label: "File Storage", icon: HardDrive, color: "bg-teal-500/20 text-teal-400" },
  { id: "advertising", label: "Advertising", icon: Megaphone, color: "bg-red-500/20 text-red-400" },
  { id: "customer-support", label: "Customer Support", icon: Headphones, color: "bg-amber-500/20 text-amber-400" },
  { id: "scheduling", label: "Scheduling", icon: Calendar, color: "bg-violet-500/20 text-violet-400" },
  { id: "web-research", label: "Web & Research", icon: Search, color: "bg-lime-500/20 text-lime-400" },
  { id: "document-processing", label: "Document Processing", icon: FileText, color: "bg-stone-500/20 text-stone-400" },
  { id: "ai-automation", label: "AI & Automation", icon: Cpu, color: "bg-fuchsia-500/20 text-fuchsia-400" },
];

export function getCategoryInfo(id: ServiceCategory): CategoryInfo | undefined {
  return SERVICE_CATEGORIES.find((c) => c.id === id);
}

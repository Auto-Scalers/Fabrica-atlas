import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { nanoid } from "nanoid";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a collision-proof ID with a prefix (e.g., "task", "goal", "proj") */
export function generateId(prefix: string): string {
  return `${prefix}_${nanoid(12)}`;
}

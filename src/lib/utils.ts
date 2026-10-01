import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges NativeWind class lists; later classes win (React Native Reusables convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

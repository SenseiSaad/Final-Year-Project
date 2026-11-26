import { clsx, type ClassValue } from "clsx";

/* Joins class names, skipping anything falsy */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

export interface ColorTheme {
  primary: string;
  name: string;
  text: string;
  textHover: string;
  textLight: string;
  bg: string;
  bgHover: string;
  bgLight: string;
  border: string;
  ring: string;
  shadow: string;
  banner: string;
}

export function getTheme(colorName?: string): ColorTheme {
  const themes: Record<string, ColorTheme> = {
    emerald: {
      primary: "emerald",
      name: "Esmeralda / Verde",
      text: "text-emerald-600",
      textHover: "hover:text-emerald-700",
      textLight: "text-emerald-500",
      bg: "bg-emerald-600",
      bgHover: "hover:bg-emerald-700",
      bgLight: "bg-emerald-50/70",
      border: "border-emerald-200",
      ring: "focus:ring-emerald-500",
      shadow: "shadow-emerald-200/50",
      banner: "bg-emerald-950",
    },
    blue: {
      primary: "blue",
      name: "Azul Farmacia",
      text: "text-blue-600",
      textHover: "hover:text-blue-700",
      textLight: "text-blue-500",
      bg: "bg-blue-600",
      bgHover: "hover:bg-blue-700",
      bgLight: "bg-blue-50/70",
      border: "border-blue-200",
      ring: "focus:ring-blue-500",
      shadow: "shadow-blue-200/50",
      banner: "bg-blue-950",
    },
    rose: {
      primary: "rose",
      name: "Carmesí / Rosa",
      text: "text-rose-600",
      textHover: "hover:text-rose-700",
      textLight: "text-rose-500",
      bg: "bg-rose-600",
      bgHover: "hover:bg-rose-700",
      bgLight: "bg-rose-50/70",
      border: "border-rose-200",
      ring: "focus:ring-rose-500",
      shadow: "shadow-rose-200/50",
      banner: "bg-rose-950",
    },
    indigo: {
      primary: "indigo",
      name: "Índigo Real",
      text: "text-indigo-600",
      textHover: "hover:text-indigo-700",
      textLight: "text-indigo-500",
      bg: "bg-indigo-600",
      bgHover: "hover:bg-indigo-700",
      bgLight: "bg-indigo-50/70",
      border: "border-indigo-200",
      ring: "focus:ring-indigo-500",
      shadow: "shadow-indigo-200/50",
      banner: "bg-indigo-950",
    },
    purple: {
      primary: "purple",
      name: "Violeta / Morado",
      text: "text-purple-600",
      textHover: "hover:text-purple-700",
      textLight: "text-purple-500",
      bg: "bg-purple-600",
      bgHover: "hover:bg-purple-700",
      bgLight: "bg-purple-50/70",
      border: "border-purple-200",
      ring: "focus:ring-purple-500",
      shadow: "shadow-purple-200/50",
      banner: "bg-purple-950",
    },
    amber: {
      primary: "amber",
      name: "Ámbar / Naranja",
      text: "text-amber-600",
      textHover: "hover:text-amber-700",
      textLight: "text-amber-500",
      bg: "bg-amber-600",
      bgHover: "hover:bg-amber-700",
      bgLight: "bg-amber-50/70",
      border: "border-amber-200",
      ring: "focus:ring-amber-500",
      shadow: "shadow-amber-200/50",
      banner: "bg-amber-950",
    }
  };

  return themes[colorName || "emerald"] || themes.emerald;
}

"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-grad-ember text-white shadow-soft hover:shadow-lift hover:brightness-[1.04] focus-visible:ring-caramel-400/40",
  secondary:
    "bg-white/85 text-cocoa-800 border border-cocoa-200 hover:border-cocoa-300 hover:bg-white focus-visible:ring-cocoa-300/40",
  ghost:
    "bg-transparent text-cocoa-700 hover:bg-cocoa-100/60 focus-visible:ring-cocoa-300/40",
  danger:
    "bg-white text-red-700 border border-red-200 hover:bg-red-50 focus-visible:ring-red-300/40",
  dark: "bg-cocoa-800 text-cream shadow-soft hover:bg-cocoa-900 focus-visible:ring-cocoa-400/40",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13px] rounded-xl gap-1.5",
  md: "h-11 px-4.5 text-sm rounded-xl gap-2",
  lg: "h-13 px-6 text-[15px] rounded-2xl gap-2.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-all duration-150",
        "outline-none focus-visible:ring-4 active:scale-[0.975]",
        "disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100",
        VARIANTS[variant],
        SIZES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
});

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z"
      />
    </svg>
  );
}

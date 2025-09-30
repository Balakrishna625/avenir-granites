import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "secondary" };
export function Button({ className = "", variant = "default", ...props }: Props) {
  const base = "inline-flex items-center justify-center px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md";
  const v =
    variant === "secondary"
      ? "bg-slate-100 hover:bg-slate-200 text-slate-900"
      : "bg-black hover:bg-gray-800 text-white";
  return <button className={`${base} ${v} ${className}`} {...props} />;
}

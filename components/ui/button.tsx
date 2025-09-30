import * as React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { 
  variant?: "default" | "secondary" | "outline" | "destructive";
  size?: "default" | "sm" | "lg";
};

export function Button({ className = "", variant = "default", size = "default", ...props }: Props) {
  const base = "inline-flex items-center justify-center font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-md transition-colors";
  
  const sizeStyles = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-xs",
    lg: "px-6 py-3 text-base"
  };
  
  const variantStyles = {
    default: "bg-black hover:bg-gray-800 text-white focus:ring-gray-500",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 focus:ring-gray-500",
    outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-gray-500",
    destructive: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
  };
  
  return (
    <button 
      className={`${base} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`} 
      {...props} 
    />
  );
}

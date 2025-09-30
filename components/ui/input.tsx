import * as React from "react";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={`border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
      {...props}
    />
  )
);
Input.displayName = "Input";

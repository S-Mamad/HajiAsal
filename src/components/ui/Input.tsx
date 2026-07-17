import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.replace(/\s/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-secondary"
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 rounded-xl border border-border bg-surface-elevated px-4 text-start text-sm text-primary transition-colors",
            "placeholder:text-dim focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30",
            error && "border-red-400 focus:border-red-400 focus:ring-red-400/20",
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

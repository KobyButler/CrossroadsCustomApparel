import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "outline";
    size?: "sm" | "md";
};

export const Button = React.forwardRef<HTMLButtonElement, Props>(
    ({ className, variant = "primary", size = "md", ...props }, ref) => {
        const v =
            variant === "primary"
                ? "btn btn-primary"
                : variant === "outline"
                    ? "btn bg-transparent hover:bg-surface"
                    : "btn btn-ghost";
        const s = size === "sm" ? "text-sm px-2 py-1.5 rounded-lg" : "";
        return <button ref={ref} className={cn(v, s, className)} {...props} />;
    }
);
Button.displayName = "Button";

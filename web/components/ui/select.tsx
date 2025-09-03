import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = ({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select className={cn("input", className)} {...props} />
);

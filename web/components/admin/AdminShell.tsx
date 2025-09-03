"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const top = [
    { href: "/", label: "Home", icon: "🏠" },
    {
        href: "/admin/orders", label: "Orders", icon: "📦", children: [
            { href: "/admin/orders/drafts", label: "Drafts", icon: "📝" },
            { href: "/admin/orders/shipping-labels", label: "Shipping labels", icon: "🚚" },
            { href: "/admin/checkouts", label: "Abandoned checkouts", icon: "🛒" }
        ]
    },
    { href: "/admin/products", label: "Products", icon: "🛍️" },
    { href: "/admin/customers", label: "Customers", icon: "👥" },
    { href: "/admin/shops", label: "Shops", icon: "🏪" },
    { href: "/admin/finance", label: "Finance", icon: "💰" },
    { href: "/admin/analytics", label: "Analytics", icon: "📊" }
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    return (
        <div className="min-h-screen grid grid-cols-[260px_1fr]">
            <aside className="border-r border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-6">
                    <div className="text-xl font-bold text-gray-900">WhiteSpace Design</div>
                    <div className="text-xs text-gray-500">Admin Dashboard</div>
                </div>
                <nav className="space-y-0.5">
                    {top.map(item => {
                        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                        const open = active && item.children?.length;
                        return (
                            <div key={item.href}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "block rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 no-underline flex items-center gap-3",
                                        active 
                                            ? "bg-gray-100 text-gray-900 border border-gray-200" 
                                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                    )}
                                >
                                    <span className="text-lg">{item.icon}</span>
                                    {item.label}
                                </Link>
                                {open && item.children && (
                                    <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-4">
                                        {item.children.map(sub => {
                                            const subActive = pathname === sub.href;
                                            return (
                                                <Link
                                                    key={sub.href}
                                                    href={sub.href}
                                                    className={cn(
                                                        "block rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 no-underline relative flex items-center gap-2",
                                                        subActive 
                                                            ? "bg-gray-100 text-gray-900 border border-gray-200" 
                                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                                                    )}
                                                >
                                                    <span className="text-sm">{sub.icon}</span>
                                                    {sub.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </aside>
            <main className="p-6 space-y-6 bg-gray-25">{children}</main>
        </div>
    );
}

"use client";
// Shared footer across all four public pages. See DESIGN.md.
import Link from "next/link";
import Image from "next/image";

export function PublicFooter() {
    return (
        <footer className="relative z-10 border-t border-crate-plywood/70">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <Link href="/shops" className="flex items-center gap-3">
                    <Image src="/logo.png" alt="Crossroads Custom Apparel" width={100} height={40} className="object-contain" />
                </Link>
                <div className="text-center sm:text-right">
                    <p className="text-xs text-crate-ink-soft">
                        Screen printing &amp; embroidery ·{" "}
                        <a href="mailto:hello@crossroadscustomapparel.com" className="hover:text-stencil-teal transition-colors">hello@crossroadscustomapparel.com</a>
                    </p>
                    <p className="text-xs text-crate-ink-soft mt-0.5">
                        © {new Date().getFullYear()} Crossroads Custom Apparel. All rights reserved. ·{" "}
                        <Link href="/login" className="hover:text-crate-ink-soft transition-colors">Staff Login</Link>
                    </p>
                </div>
            </div>
        </footer>
    );
}

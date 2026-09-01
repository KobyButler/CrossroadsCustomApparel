"use client";
// Shared footer across all four public pages. See DESIGN.md.
import Link from "next/link";
import Image from "next/image";

export function PublicFooter() {
    return (
        <footer className="relative z-10 border-t border-plate-800">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <Link href="/" className="flex items-center gap-3">
                    {/* See PublicHeader.tsx for why this needs an explicit h-* / w-* —
                        logo.png is actually square, not this landscape ratio. */}
                    <Image src="/logo.png" alt="Crossroads Custom Apparel" width={40} height={40} className="object-contain h-[40px] w-[40px] shrink-0" />
                </Link>
                <div className="text-center sm:text-right">
                    <p className="text-xs text-plate-300">
                        Screen printing &amp; embroidery ·{" "}
                        <a href="mailto:hello@crossroadscustomapparel.com" className="hover:text-proc-cyan transition-colors">hello@crossroadscustomapparel.com</a>
                    </p>
                    <p className="text-xs text-plate-300 mt-0.5">
                        © {new Date().getFullYear()} Crossroads Custom Apparel. All rights reserved. ·{" "}
                        <Link href="/login" className="hover:text-plate-100 transition-colors">Staff Login</Link>
                    </p>
                </div>
            </div>
        </footer>
    );
}

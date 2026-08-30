import "./globals.css";
import AdminShell from "@/components/admin/AdminShell";
import { CartProvider } from "@/lib/cart";

export const metadata = {
    title: "Crossroads Custom Apparel",
    description: "Screen printing & embroidery order management",
    icons: { icon: "/icon.svg" }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                {/*
                THESIS: Every order is a manifest line moving through the shop, not another
                white-card SaaS dashboard behind a violet gradient sidebar.
                OWN-WORLD (rev. 2, user-directed): near-black graphite panels lit by four
                disciplined instrument signals — cyan (primary/live), green (fulfilled),
                amber (overdue), red (cancelled) — now with real depth: layered shadows,
                cyan-family gradients on primary actions/panel grounds, two slow ambient
                glow fields behind the canvas, hover-lift on every interactive surface.
                No violet anywhere; no glassmorphism/backdrop-blur as decoration. IBM Plex
                Sans/Mono type. Sharp 6px corners. Content spans the full viewport
                (max-w-1800px, centered) instead of a narrow left-hugging column.
                STORY: Koby reads the dashboard like a dispatch console — what's overdue
                glows amber, what shipped is quiet and green, every number exact, and the
                whole thing feels alive rather than static.
                FIRST VIEWPORT: A dark instrument row of KPI dial tiles up top, a live
                order manifest table below with amber/green/red status lamps, sidebar as
                a loaded dispatch bay. Signature interaction: KPI tiles and order rows
                lift with a real shadow on hover; an overdue lamp pulses; the primary
                action sweeps a light across itself once on hover.
                FORM: The Manifest Line — assigned, index 5 of 7, seed key 6153ece7.
                SCOPE (rev. 2): this system now covers the entire application, not just
                the dashboard — every admin route, the storefront, checkout, and login.
                FINISH: unreviewed and undocumented is unfinished; this build ends with
                the finish review, the verdict, DESIGN.md, and every shipping raster
                carrying its provenance.
                */}
                <CartProvider>
                    <AdminShell>{children}</AdminShell>
                </CartProvider>
            </body>
        </html>
    );
}

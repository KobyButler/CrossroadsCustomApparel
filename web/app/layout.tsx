import "./globals.css";
import AdminShell from "@/components/admin/AdminShell";
import { CartProvider } from "@/lib/cart";

export const metadata = {
    metadataBase: new URL("https://crossroadscustomapparel.com"),
    title: "Crossroads Custom Apparel | Custom Screen Printing & Embroidery",
    description: "Custom screen printing and embroidery for tees, hoodies, hats, and more. Browse open shops or get in touch to start your order — locally owned in Castle Dale, Utah.",
    icons: { icon: "/icon.svg" },
    openGraph: {
        title: "Crossroads Custom Apparel",
        description: "Custom screen printing & embroidery for teams, schools, and events.",
        images: ["/logo.png"],
        type: "website"
    }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                {/*
                Two visual worlds now share this app, split by mode, both recorded in
                DESIGN.md — this comment is the audit trail for both.

                ADMIN/LOGIN — "The Manifest Line" (Operate). THESIS: every order is a
                manifest line moving through the shop. OWN-WORLD: near-black graphite
                panels, four disciplined instrument signals (cyan/green/amber/red),
                layered shadows, cyan-family gradients, two ambient glow fields, hover-
                lift everywhere. IBM Plex Sans/Mono. Sharp 6px corners, full-viewport
                content (max-w-1800px). FORM: assigned, index 5 of 7, seed key 6153ece7.

                LANDING/GROUP SHOPS/CHECKOUT — "The Gear Drop" (Persuade), added
                2026-08-31 after direct feedback that the console world read as
                "lifeless and bleak" for the public storefront. THESIS: the storefront
                looks like the actual fulfillment — a packed gear crate on a sunlit
                workbench — not a software product grid, and not the admin's night
                dispatch bay. OWN-WORLD: warm kraft/cardboard ground (never white, never
                black), four stencil-ink accents (barn red/marigold gold/teal/forest
                green), every shop/product tile a punched-hole kraft luggage tag at a
                slight scattered tilt, Allerta Stencil display, Barlow body,
                Space Mono for every price/count/SKU. FORM: assigned, index 6 of 7
                grounded candidates, seed key 8bfab481, weighed against 6 catalog
                challengers (none won both axes). Full contract in app/page.tsx.

                SCOPE: Admin and Login render through AdminShell's console branch and
                keep the console system exclusively. Landing, Group Shops, and Checkout
                render through AdminShell's isPublic branch (components/admin/
                AdminShell.tsx) and use the Gear Drop system exclusively — the two never
                mix on one page.
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

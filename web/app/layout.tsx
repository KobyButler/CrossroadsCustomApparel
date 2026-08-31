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

// JSX {/* comments */} are stripped at compile time and never reach the
// emitted DOM — a production build erases them entirely, which is exactly
// the "contract the build erased" failure mode the audit-trail requirement
// warns about (confirmed by grepping .next/server/app/index.html: zero
// hits). dangerouslySetInnerHTML on the very first child of <body> is the
// one reliable way React actually emits a literal <!-- --> comment node
// into shipped markup instead of silently discarding it.
const DIRECTION_CONTRACT = `<!--
Two visual worlds now share this app, split by mode, both recorded in
DESIGN.md -- this comment is the audit trail for both.

ADMIN/LOGIN -- "The Manifest Line" (Operate). THESIS: every order is a
manifest line moving through the shop. OWN-WORLD: near-black graphite
panels, four disciplined instrument signals (cyan/green/amber/red),
layered shadows, cyan-family gradients, two ambient glow fields, hover-
lift everywhere. IBM Plex Sans/Mono. Sharp 6px corners, full-viewport
content (max-w-1800px). FORM: assigned, index 5 of 7, seed key 6153ece7.

LANDING/GROUP SHOPS/CHECKOUT -- "The Print Floor" (Persuade), replaced
2026-08-31 by explicit request for a full redesign toward "clean, sleek,
modern, futuristic... full... not AI feel" -- a hard pivot away from the
warm kraft-crate world above, retired same-day. THESIS: the shop looks
like the actual production file that will print it -- because in-house,
it is. OWN-WORLD: a dark pre-press light-table system -- film-positive
cards glowing on a backlit table, registration crosshairs instead of
decoration, one Pantone spot ink per shop (crimson/cobalt/marigold/
emerald, hashed per shop id), a fixed CMYK set reserved for technical
marks only. Nothing tilts -- everything registers precisely, the
opposite signature from the retired world. Big Shoulders Display,
Public Sans, Fragment Mono; a true seven-segment mask for the closing
countdown and live counts. FORM: IMPECCABLE'S PICK -- the user locked
the top-ranked grounded candidate over the roll's assigned direction
("The Scorebug", a live-broadcast-graphics system, seed key 95845a44)
and 6 declined catalog challengers. Full contract in app/page.tsx.

SCOPE: Admin and Login render through AdminShell's console branch and
keep the console system exclusively. Landing, Group Shops, and Checkout
render through AdminShell's isPublic branch (components/admin/
AdminShell.tsx) and use the Print Floor system exclusively -- the two
never mix on one page.
FINISH: unreviewed and undocumented is unfinished; this build ends with
the finish review, the verdict, DESIGN.md, and every shipping raster
carrying its provenance.
-->`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <div style={{ display: "contents" }} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />
                <CartProvider>
                    <AdminShell>{children}</AdminShell>
                </CartProvider>
            </body>
        </html>
    );
}

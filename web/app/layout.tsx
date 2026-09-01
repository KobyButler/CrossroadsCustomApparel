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
One visual world now covers the whole app, in two registers, recorded in
DESIGN.md -- this comment is the audit trail.

THESIS: the shop looks like the actual production file that will print
it -- because in-house, it is -- and the console that runs the shop looks
like the floor that room sits on. OWN-WORLD: a dark pre-press light-table
system -- film-positive cards glowing on a backlit table, registration
crosshairs instead of decoration, a fixed CMYK set reserved for technical
marks only. Nothing tilts -- everything registers precisely. Big
Shoulders Display, Public Sans, Fragment Mono, app-wide.

PERSUADE (Landing, Group Shops, Checkout): established 2026-08-31 by
explicit request for a full public-storefront redesign toward "clean,
sleek, modern, futuristic... full... not AI feel," replacing a warm
kraft-crate world retired same-day -- chosen through a structured
direction round (seed key 95845a44; the roll assigned a live-broadcast
direction, "The Scorebug"; the user locked IMPECCABLE'S PICK instead).
One Pantone spot ink per shop (crimson/cobalt/marigold/emerald, hashed
per shop id) carries every accent inside that shop's context. A true
seven-segment mask carries the closing countdown and live counts. One
signature load moment: four CMYK separations of a hand-drawn garment
snap into register on the landing hero, closing with an exposure flash,
never repeated. Full contract in app/page.tsx.

OPERATE (Admin, Login): extended 2026-09-01 by explicit follow-up
request ("extend it to the rest of the site... should look like this"),
retiring "The Manifest Line" as a separate palette/type system. Same
ground, same process set, same type stack, denser and calmer where the
storefront is expressive: a persistent sidebar, sharper small radii, no
per-shop dynamic spot (admin has no single shop) -- instead the same
four inks run as a locked four-state system (cyan=interactive,
emerald=success, marigold=needs-action, crimson=critical), the exact
role the console's original signal colors held. Executed as a token
value swap, not a markup rewrite: graphite/signal now resolve to the
same hex as plate/spot-derived inks.

SCOPE: every route shares one palette, one type system, one canvas
(.press-canvas, .console-canvas retired). The only remaining split is
register (Operate vs Persuade), never identity.
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

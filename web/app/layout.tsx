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
                <CartProvider>
                    <AdminShell>{children}</AdminShell>
                </CartProvider>
            </body>
        </html>
    );
}

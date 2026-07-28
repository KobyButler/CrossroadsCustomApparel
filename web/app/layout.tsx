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
                <CartProvider>
                    <AdminShell>{children}</AdminShell>
                </CartProvider>
            </body>
        </html>
    );
}

import "./globals.css";
import { Inter } from "next/font/google";
import AdminShell from "@/components/admin/AdminShell";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={`${inter.className} min-h-screen bg-bg text-text`}>
                <AdminShell>{children}</AdminShell>
            </body>
        </html>
    );
}

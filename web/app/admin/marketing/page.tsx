import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function Marketing() {
    return (
        <div className="grid md:grid-cols-2 gap-4">
            <Card>
                <CardHeader><CardTitle>Campaigns</CardTitle></CardHeader>
                <CardContent className="text-sm text-gray-400">
                    Use discounts as promo codes for team shops. Coming next: email exports & UTM tracking.
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle>Discounts</CardTitle></CardHeader>
                <CardContent><Link href="/admin/discounts" className="btn btn-primary no-underline">Manage discounts</Link></CardContent>
            </Card>
        </div>
    );
}

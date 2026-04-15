import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth protection is handled client-side in AdminShell.
// This middleware is intentionally a no-op.
export function middleware(_req: NextRequest) {
    return NextResponse.next();
}

export const config = {
    matcher: []
};

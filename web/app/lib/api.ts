// Lightweight fetch helper used across admin + shop
export async function api(
    path: string,
    init?: RequestInit
): Promise<any> {
    const base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000/api";
    const res = await fetch(`${base}${path}`, {
        headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
        ...init
    });
    if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
            const j = await res.json();
            msg += j?.error ? `: ${j.error}` : j?.message ? `: ${j.message}` : "";
        } catch {
            // ignore
        }
        throw new Error(msg);
    }
    if (res.status === 204 || init?.method === "HEAD") return null;
    const text = await res.text();
    try { return text ? JSON.parse(text) : null; } catch { return text; }
}

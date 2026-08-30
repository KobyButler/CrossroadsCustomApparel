import { prisma } from '../prisma.js';

export type FieldChange = { field: string; label: string; oldValue: string | null; newValue: string | null };

function fmtCents(v: unknown): string {
    const n = Number(v);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((Number.isFinite(n) ? n : 0) / 100);
}
function fmtBool(v: unknown): string {
    return v ? 'Yes' : 'No';
}

const SCALAR_FIELDS: { key: string; label: string; format?: (v: unknown) => string }[] = [
    { key: 'customerName', label: 'Customer name' },
    { key: 'customerEmail', label: 'Customer email' },
    { key: 'status', label: 'Status' },
    { key: 'paymentStatus', label: 'Payment status' },
    { key: 'paymentMethod', label: 'Payment method' },
    { key: 'shippingMethod', label: 'Shipping method' },
    { key: 'shippingCents', label: 'Shipping cost', format: fmtCents },
    { key: 'taxCents', label: 'Tax', format: fmtCents },
    { key: 'shipAddress1', label: 'Address line 1' },
    { key: 'shipAddress2', label: 'Address line 2' },
    { key: 'shipCity', label: 'City' },
    { key: 'shipState', label: 'State' },
    { key: 'shipZip', label: 'ZIP' },
    { key: 'residential', label: 'Residential', format: fmtBool },
    { key: 'specialInstructions', label: 'Special instructions' },
    { key: 'totalCents', label: 'Total', format: fmtCents },
];

// Compares two flat "before"/"after" records field-by-field, producing one
// FieldChange per field that actually differs (skipping unchanged fields).
export function diffScalarFields(before: Record<string, any>, after: Record<string, any>): FieldChange[] {
    const changes: FieldChange[] = [];
    for (const f of SCALAR_FIELDS) {
        const a = before[f.key];
        const b = after[f.key];
        if (a === b) continue;
        const oldValue = a === null || a === undefined || a === '' ? null : (f.format ? f.format(a) : String(a));
        const newValue = b === null || b === undefined || b === '' ? null : (f.format ? f.format(b) : String(b));
        if (oldValue === newValue) continue;
        changes.push({ field: f.key, label: f.label, oldValue, newValue });
    }
    return changes;
}

type ItemLike = {
    id?: string; productId: string; productName?: string;
    size?: string | null; color?: string | null; quantity: number; priceCents: number;
};

function describeItem(i: ItemLike): string {
    const variant = [i.size, i.color].filter(Boolean).join('/');
    return `${i.quantity}x ${i.productName ?? i.productId}${variant ? ` (${variant})` : ''} @ ${fmtCents(i.priceCents)}`;
}

// Diffs an order's line items by id: items present before but not after are
// "removed", items with no id are "added", and items present in both with any
// differing field are reported as "changed" (one entry per changed item).
export function diffItems(before: ItemLike[], after: ItemLike[]): FieldChange[] {
    const changes: FieldChange[] = [];
    const beforeById = new Map(before.filter(i => i.id).map(i => [i.id, i]));
    const afterIds = new Set(after.filter(i => i.id).map(i => i.id));

    for (const b of before) {
        if (b.id && !afterIds.has(b.id)) {
            changes.push({ field: 'items', label: 'Item removed', oldValue: describeItem(b), newValue: null });
        }
    }
    for (const a of after) {
        if (!a.id) {
            changes.push({ field: 'items', label: 'Item added', oldValue: null, newValue: describeItem(a) });
            continue;
        }
        const b = beforeById.get(a.id);
        if (!b) continue;
        if (b.productId !== a.productId || b.size !== a.size || b.color !== a.color || b.quantity !== a.quantity || b.priceCents !== a.priceCents) {
            changes.push({ field: 'items', label: `Item changed (${a.productName ?? a.productId})`, oldValue: describeItem(b), newValue: describeItem(a) });
        }
    }
    return changes;
}

export async function recordOrderHistory(orderId: string, userEmail: string | null | undefined, changes: FieldChange[]): Promise<void> {
    if (changes.length === 0) return;
    await prisma.orderHistoryEntry.create({
        data: { orderId, userEmail: userEmail ?? null, changesJson: JSON.stringify(changes) }
    });
}

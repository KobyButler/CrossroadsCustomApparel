import axios from 'axios';
import { config } from '../config.js';

export type Address = {
    name: string;
    street1: string;
    street2?: string | null;
    city: string;
    state: string;
    zip: string;
    residential?: boolean;
    email?: string | null;
};

export type RateQuote = { cents: number; provider: string; service: string; estimatedDays: number | null };

export type PurchasedLabel = {
    transactionId: string;
    labelUrl: string;
    trackingNumber: string | null;
    carrier: string;
    service: string;
    cents: number;
};

// A single default parcel size covering a typical small group-order shipment
// (a handful of folded shirts/hoodies). Good enough for an estimate; refine
// later if orders regularly run much larger.
const DEFAULT_PARCEL = { length: '14', width: '11', height: '4', distance_unit: 'in' as const };

function authHeader() {
    return { Authorization: `ShippoToken ${config.shipping.shippoApiKey}`, 'Content-Type': 'application/json' };
}

// Creates a Shippo shipment (a from/to/parcel combo) and returns the raw
// response, which includes every carrier rate quoted for it. Shared by the
// rate-preview and label-purchase flows below so both price the same parcel
// the same way.
async function createShipment(from: Address, to: Address, totalWeightOz: number) {
    const payload = {
        address_from: {
            name: from.name, street1: from.street1, street2: from.street2 || undefined,
            city: from.city, state: from.state, zip: from.zip, country: 'US'
        },
        address_to: {
            name: to.name, street1: to.street1, street2: to.street2 || undefined,
            city: to.city, state: to.state, zip: to.zip, country: 'US',
            email: to.email || undefined
        },
        parcels: [{
            ...DEFAULT_PARCEL,
            weight: String(Math.max(totalWeightOz, 1)),
            mass_unit: 'oz'
        }],
        async: false
    };

    const resp = await axios.post('https://api.goshippo.com/shipments/', payload, {
        headers: authHeader(),
        timeout: 15000
    });
    return resp.data;
}

function cheapestUsableRate(shipment: any): any | null {
    const rates: any[] = Array.isArray(shipment?.rates) ? shipment.rates : [];
    const usable = rates.filter(r => r.amount && !r.messages?.length);
    if (usable.length === 0) return null;
    return usable.reduce((best, r) => parseFloat(r.amount) < parseFloat(best.amount) ? r : best);
}

// Returns the cheapest reasonable ground/standard rate for the given weight
// and destination, or null if Shippo isn't configured or returns no rates.
export async function getShippingRate(from: Address, to: Address, totalWeightOz: number): Promise<RateQuote | null> {
    if (!config.shipping.enable) return null;

    const shipment = await createShipment(from, to, totalWeightOz);
    const cheapest = cheapestUsableRate(shipment);
    if (!cheapest) return null;

    return {
        cents: Math.round(parseFloat(cheapest.amount) * 100),
        provider: cheapest.provider,
        service: cheapest.servicelevel?.name ?? cheapest.servicelevel?.token ?? 'Standard',
        estimatedDays: cheapest.estimated_days ?? null
    };
}

// Buys the cheapest usable rate for the given shipment and returns a
// print-ready label PDF (hosted by Shippo) plus the tracking number. Throws
// on any Shippo-reported failure (bad address, no rates, etc.) so the caller
// can surface a real error instead of silently doing nothing.
export async function purchaseShippingLabel(from: Address, to: Address, totalWeightOz: number): Promise<PurchasedLabel> {
    if (!config.shipping.enable) {
        throw new Error('Shipping isn\'t configured — set SHIPPO_API_KEY on the server');
    }

    const shipment = await createShipment(from, to, totalWeightOz);
    const cheapest = cheapestUsableRate(shipment);
    if (!cheapest) {
        const messages: any[] = Array.isArray(shipment?.rates)
            ? shipment.rates.flatMap((r: any) => r.messages ?? [])
            : [];
        const detail = messages.map((m: any) => m.text).filter(Boolean).join('; ');
        throw new Error(detail || 'No shipping rates available for this address');
    }

    const txResp = await axios.post('https://api.goshippo.com/transactions/', {
        rate: cheapest.object_id,
        label_file_type: 'PDF',
        async: false
    }, { headers: authHeader(), timeout: 20000 });

    const tx = txResp.data;
    if (tx.status !== 'SUCCESS') {
        const detail = Array.isArray(tx.messages) ? tx.messages.map((m: any) => m.text).filter(Boolean).join('; ') : '';
        throw new Error(detail || 'Shippo could not generate a label for this order');
    }

    return {
        transactionId: tx.object_id,
        labelUrl: tx.label_url,
        trackingNumber: tx.tracking_number ?? null,
        carrier: cheapest.provider,
        service: cheapest.servicelevel?.name ?? cheapest.servicelevel?.token ?? 'Standard',
        cents: Math.round(parseFloat(cheapest.amount) * 100)
    };
}

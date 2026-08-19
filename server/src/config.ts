import 'dotenv/config';

function bool(v: string | undefined, def = false) {
    if (v === undefined) return def;
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

export const config = {
    port: Number(process.env.PORT ?? 4000),
    jwtSecret: process.env.JWT_SECRET ?? 'devsecret',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
        .split(',').map(s => s.trim()),

    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY ?? '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
        enable: bool(process.env.STRIPE_ENABLE, true),
    },

    ss: {
        user: process.env.SS_USER ?? '',
        apiKey: process.env.SS_API_KEY ?? '',
        enable: bool(process.env.SS_ENABLE)
    },

    // Ship-to address used when placing consolidated restock POs with vendors
    // (Order Report → Place Order) — blanks ship here to be decorated, not to customers.
    business: {
        name: process.env.BUSINESS_NAME ?? 'Crossroads Custom Apparel',
        email: process.env.BUSINESS_EMAIL ?? process.env.ADMIN_NOTIFY_EMAIL ?? 'hello@crossroadscustomapparel.com',
        address1: process.env.BUSINESS_ADDRESS1 ?? '',
        address2: process.env.BUSINESS_ADDRESS2 ?? '',
        city: process.env.BUSINESS_CITY ?? '',
        state: process.env.BUSINESS_STATE ?? '',
        zip: process.env.BUSINESS_ZIP ?? '',
        residential: bool(process.env.BUSINESS_RESIDENTIAL, false)
    },

    // Customer checkout shipping: live rates via Shippo when configured, otherwise
    // a flat-rate fallback so "Ship to You" still works before a Shippo key exists.
    shipping: {
        shippoApiKey: process.env.SHIPPO_API_KEY ?? '',
        enable: Boolean(process.env.SHIPPO_API_KEY),
        flatRateCents: Number(process.env.SHIPPING_FLAT_RATE_CENTS ?? 800),
        defaultItemWeightOz: Number(process.env.SHIPPING_DEFAULT_ITEM_WEIGHT_OZ ?? 6),
    },

    smtp: {
        host: process.env.SMTP_HOST ?? '',
        port: Number(process.env.SMTP_PORT ?? 587),
        user: process.env.SMTP_USER ?? '',
        pass: process.env.SMTP_PASS ?? '',
        from: process.env.SMTP_FROM ?? 'hello@crossroadscustomapparel.com',
        adminEmail: process.env.ADMIN_NOTIFY_EMAIL ?? '',
        enable: bool(process.env.SMTP_ENABLE)
    },

    sanmar: {
        customerNumber: process.env.SANMAR_CUSTOMER_NUMBER ?? '',
        username: process.env.SANMAR_USERNAME ?? '',
        password: process.env.SANMAR_PASSWORD ?? '',
        // PO-specific credentials — fall back to main creds when not set (production)
        poUsername: process.env.SANMAR_PO_USERNAME || process.env.SANMAR_USERNAME || '',
        poPassword: process.env.SANMAR_PO_PASSWORD || process.env.SANMAR_PASSWORD || '',
        wsdlUrl: process.env.SANMAR_WSDL_URL ?? '',
        orderStatusWsdlUrl: process.env.SANMAR_ORDER_STATUS_WSDL_URL ?? '',
        shipmentWsdlUrl: process.env.SANMAR_SHIPMENT_WSDL_URL ?? '',
        invoiceWsdlUrl: process.env.SANMAR_INVOICE_WSDL_URL ?? '',
        inventoryWsdlUrl: process.env.SANMAR_INVENTORY_WSDL_URL ?? '',
        inventoryStageWsdlUrl: process.env.SANMAR_INVENTORY_STAGE_WSDL_URL ?? '',
        productInfoWsdlUrl: process.env.SANMAR_PRODUCTINFO_WSDL_URL ?? '',
        enable: bool(process.env.SANMAR_ENABLE),
        // Preferred distribution center (SanMar's internal warehouse number, e.g. 4)
        // to consolidate PO line items into a single shipment when possible. Unset
        // by default — SanMar auto-picks the best-stocked warehouse per line, which
        // can split one order across multiple shipments/warehouses. When set, every
        // line is first tried against this warehouse; any line it doesn't actually
        // have stock for falls back to auto-select for just that item (see
        // adjustForDefaultWarehouse in vendors/sanmar.ts) — this never blocks an
        // order from fully shipping, it only prefers consolidation when possible.
        defaultWarehouse: (() => {
            const n = Number(process.env.SANMAR_DEFAULT_WAREHOUSE);
            return Number.isInteger(n) && n > 0 ? n : null;
        })(),
        sftp: {
            host: process.env.SANMAR_SFTP_HOST ?? '',
            port: Number(process.env.SANMAR_SFTP_PORT ?? 2200),
            user: process.env.SANMAR_SFTP_USER ?? '',
            password: process.env.SANMAR_SFTP_PASSWORD ?? '',
            enable: bool(process.env.SANMAR_SFTP_ENABLE),
            remoteDir: process.env.SANMAR_SFTP_DIR ?? 'SanmarPDD'
        }
    }
};

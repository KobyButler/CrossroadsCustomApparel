import { config } from '../config.js';
import * as soap from 'soap';
import { prisma } from '../prisma.js';
import { vendorStyleCode } from '../utils/vendorGrouping.js';

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function asArray<T>(value: T | T[] | null | undefined): T[] {
    if (Array.isArray(value)) return value;
    return value == null ? [] : [value];
}

function sanmarReturnedError(ret: any): boolean {
    return ret?.errorOccurred === true ||
        ret?.errorOccured === true ||
        ret?.errorOccurred === 'true' ||
        ret?.errorOccured === 'true';
}

function sumInventoryQty(ret: any): number {
    // Some SanMar inventory responses return listResponse values per warehouse.
    if (ret?.listResponse !== undefined) {
        return asArray(ret.listResponse)
            .reduce((sum, qty) => sum + Number(qty ?? 0), 0);
    }

    // Style-level responses can return response.skus.sku[].whse[].qty
    const skus = asArray(ret?.response?.skus?.sku);
    return skus.reduce((skuTotal, sku: any) => {
        return skuTotal + asArray(sku?.whse)
            .reduce((whseTotal, whse: any) => whseTotal + Number(whse?.qty ?? 0), 0);
    }, 0);
}

function normalize(s: unknown): string {
    return String(s ?? '').trim().toLowerCase();
}

function lineMatchKey(d: { style?: unknown; color?: unknown; size?: unknown }): string {
    return `${normalize(d.style)}|${normalize(d.color)}|${normalize(d.size)}`;
}

// When a default warehouse is configured, buildPOEnvelope already tries every
// line against it. This reads the pre-submit response (SanMar's own dry-run
// check — confirmed live that it honors a forced whseNo and reports back
// per-line availability there) and reverts any line that warehouse doesn't
// actually have stock for back to '' (auto-select), so the PO still fully
// ships — just from wherever necessary — instead of failing or backordering
// those specific items. If the pre-submit call itself didn't return a usable
// per-line list (network hiccup, unexpected shape), every line falls back to
// auto-select — never guess availability, only trust what SanMar confirmed.
function adjustForDefaultWarehouse(poEnvelope: any, presubmitResp: any): void {
    const checked = asArray(presubmitResp?.return?.response?.webServicePoDetailList);
    const availableAtDefault = new Set(
        checked.filter((d: any) => d?.errorOccured === false).map(lineMatchKey)
    );
    poEnvelope.webServicePoDetailList = poEnvelope.webServicePoDetailList.map((d: any) =>
        availableAtDefault.has(lineMatchKey(d)) ? d : { ...d, whseNo: '' }
    );
}

type LineGroup = Array<{
    item: any;
    product: { vendorIdentifier: string | null; sku: string };
}>;

/* ─── PO Submission ───────────────────────────────────────────────────────── */

export async function submitOrderToSanMar(order: any, lines: LineGroup) {
    if (!config.sanmar.enable) return { dryRun: true, note: 'SANMAR_ENABLE=false' };
    if (!config.sanmar.wsdlUrl) throw new Error('SANMAR_WSDL_URL is required');
    if (!config.sanmar.customerNumber) throw new Error('SANMAR_CUSTOMER_NUMBER is required');

    const client = await soap.createClientAsync(config.sanmar.wsdlUrl);

    const poEnvelope = await buildPOEnvelope(order, lines);
    const auth = poAuthArgs();

    // Pre-submit availability check (SanMar's own documented dry-run step).
    // Failures here are non-fatal — submitPO often returns clearer messages —
    // but when a default warehouse is configured, a successful response also
    // drives which lines actually get consolidated there vs fall back to
    // auto-select (see adjustForDefaultWarehouse). If this call fails, every
    // line stays on auto-select rather than guessing default-warehouse stock.
    try {
        const [presubmit] = await client.getPreSubmitInfoAsync({ arg0: poEnvelope, arg1: auth });
        if (config.sanmar.defaultWarehouse != null) {
            adjustForDefaultWarehouse(poEnvelope, presubmit);
        }
    } catch {
        if (config.sanmar.defaultWarehouse != null) {
            poEnvelope.webServicePoDetailList = poEnvelope.webServicePoDetailList.map((d: any) => ({ ...d, whseNo: '' }));
        }
    }

    const [resp] = await client.submitPOAsync({ arg0: poEnvelope, arg1: auth });
    // SanMar returns HTTP 200 even when it rejects the PO (bad style/color/size,
    // validation failures, etc) — errorOccurred is the only signal, so check it
    // explicitly rather than treating any non-throwing response as success.
    if (sanmarReturnedError(resp?.return)) {
        throw new Error(resp?.return?.message ?? 'SanMar rejected the purchase order');
    }
    return { message: resp?.return?.message ?? 'Submitted', poNumber: order.id, raw: resp };
}

async function buildPOEnvelope(order: any, lines: LineGroup) {
    // Live per-style lookups are memoized within a single PO build — a PO with
    // several colors/sizes of the same style shares one SanMar call instead of
    // firing a duplicate live lookup per line.
    const liveInfoByStyle = new Map<string, Promise<SanMarProduct>>();
    function getLiveInfoCached(style: string): Promise<SanMarProduct> {
        if (!liveInfoByStyle.has(style)) liveInfoByStyle.set(style, getSanMarProductInfo(style));
        return liveInfoByStyle.get(style)!;
    }

    const detailList = await Promise.all(lines.map(async ({ item, product }) => {
        // Use the vendor's own style code, not the (freely-editable, possibly
        // duplicate-suffixed) Crossroads SKU — SanMar only recognizes its own codes.
        const style = vendorStyleCode(product);

        // Look up the exact variant for inventoryKey + sizeIndex (SanMar's recommended approach)
        const variant = await prisma.sanmarCatalogProduct.findFirst({
            where: {
                style,
                colorName: item.color ?? '',
                sizeName:  item.size  ?? '',
            },
            select: { inventoryKey: true, sizeIndex: true, mainframeColor: true },
        });

        let inventoryKey    = variant?.inventoryKey ? Number(variant.inventoryKey) : null;
        let sizeIndex       = variant?.sizeIndex    ? Number(variant.sizeIndex)    : null;
        let mainframeColor  = variant?.mainframeColor ?? null;

        // SanMar's PO API validates `color` against its internal mainframe color code
        // (e.g. "LtHtGry"), not the display name shown to customers ("Light Heather
        // Grey") — sending the display name gets rejected as "Invalid color" even when
        // it's a perfectly valid catalog color. If our cached SFTP catalog doesn't have
        // this variant yet (new style, or synced before this field existed), resolve it
        // live from SanMar's per-style Product Info API and cache the result — this
        // variant will never need a live lookup again after this one time.
        if (!mainframeColor) {
            let info: SanMarProduct;
            try {
                info = await getLiveInfoCached(style);
            } catch (err: any) {
                throw new Error(`Could not look up ${style} "${item.color}" ${item.size} from SanMar (${err?.message ?? 'lookup failed'}) — try again in a moment.`);
            }

            const rows = asArray((info.raw as any)?.return?.listResponse);
            const match = rows.find((r: any) => {
                const b = r?.productBasicInfo;
                return b && normalize(b.color) === normalize(item.color) && normalize(b.size) === normalize(item.size);
            });
            const basic = match?.productBasicInfo;

            if (!basic?.catalogColor) {
                throw new Error(`SanMar has no record of ${style} in color "${item.color}" size "${item.size}" — double-check the color and size are correct.`);
            }

            mainframeColor = basic.catalogColor;
            inventoryKey   = basic.inventoryKey ? Number(basic.inventoryKey) : inventoryKey;
            sizeIndex      = basic.sizeIndex    ? Number(basic.sizeIndex)    : sizeIndex;

            // Best-effort cache write — a failure here shouldn't block the PO,
            // it just means this variant gets resolved live again next time.
            await prisma.sanmarCatalogProduct.upsert({
                where: { style_colorName_sizeName: { style, colorName: item.color ?? '', sizeName: item.size ?? '' } },
                create: {
                    style, colorName: item.color ?? '', sizeName: item.size ?? '',
                    mainframeColor,
                    inventoryKey:     inventoryKey ? String(inventoryKey) : null,
                    sizeIndex:        sizeIndex    ? String(sizeIndex)    : null,
                    title:            basic.productTitle ?? null,
                    description:      basic.productDescription ?? null,
                    brand:            basic.brandName ?? null,
                    category:         basic.category ?? null,
                    priceCents:       match?.productPriceInfo?.piecePrice ? Math.round(Number(match.productPriceInfo.piecePrice) * 100) : 0,
                    colorSwatchImage: match?.productImageInfo?.colorSwatchImage ?? null,
                    productImage:     match?.productImageInfo?.colorProductImage ?? match?.productImageInfo?.productImage ?? null,
                },
                update: {
                    mainframeColor,
                    ...(inventoryKey ? { inventoryKey: String(inventoryKey) } : {}),
                    ...(sizeIndex    ? { sizeIndex: String(sizeIndex) }       : {}),
                },
            }).catch(err => console.error('[SanMar] failed to cache live-resolved variant (non-fatal):', err));
        }

        return {
            ...(inventoryKey && sizeIndex ? { inventoryKey, sizeIndex } : {}),
            style,
            color: mainframeColor,
            size:     item.size     ?? '',
            quantity: Number(item.quantity),
            // Tentatively assigned to the configured default warehouse (if any) so
            // the whole order consolidates into one shipment when possible —
            // submitOrderToSanMar checks real availability there via the pre-submit
            // call and reverts individual lines to '' (auto-select) if this specific
            // warehouse doesn't actually have stock for them.
            whseNo: config.sanmar.defaultWarehouse ?? '',
        };
    }));

    return {
        attention:    order.customerName,
        notes:        '',
        poNum:        order.id,
        shipTo:       order.customerName,
        shipAddress1: order.shipAddress1,
        shipAddress2: order.shipAddress2 ?? '',
        shipCity:     order.shipCity,
        shipState:    order.shipState,
        shipZip:      order.shipZip,
        shipMethod:   'UPS',
        shipEmail:    order.customerEmail ?? 'hello@crossroadscustomapparel.com',
        residence:    order.residential ? 'Y' : 'N',
        department:   '',
        webServicePoDetailList: detailList,
    };
}

function poAuthArgs() {
    return {
        sanMarCustomerNumber: Number(config.sanmar.customerNumber || 0),
        sanMarUserName: config.sanmar.poUsername,
        sanMarUserPassword: config.sanmar.poPassword,
    };
}

/* ─── Inventory Check ─────────────────────────────────────────────────────── */

export interface InventoryResult {
    style: string;
    color: string;
    size: string;
    qty: number;
    /** true if the SOAP call was skipped (not enabled / missing config) */
    dryRun?: boolean;
}

/**
 * Check inventory for a single style/color/size combination.
 * SanMar inventory service uses positional args (arg0–arg5):
 *   arg0 = SanMarCustomerNumber
 *   arg1 = SanMarUsername
 *   arg2 = SanMarPassword
 *   arg3 = Style
 *   arg4 = Catalog/Mainframe Color (not display color)
 *   arg5 = Size
 */
export async function checkSanMarInventory(
    style: string,
    color: string,
    size: string
): Promise<InventoryResult> {
    if (!config.sanmar.enable) {
        return { style, color, size, qty: 0, dryRun: true };
    }

    const wsdlUrl = config.sanmar.inventoryWsdlUrl || config.sanmar.inventoryStageWsdlUrl;
    if (!wsdlUrl) throw new Error('SANMAR_INVENTORY_WSDL_URL is required');
    if (!config.sanmar.customerNumber) throw new Error('SANMAR_CUSTOMER_NUMBER is required');

    const client = await soap.createClientAsync(wsdlUrl);

    const [resp] = await client.getInventoryQtyForStyleColorSizeAsync({
        arg0: Number(config.sanmar.customerNumber),
        arg1: config.sanmar.username,
        arg2: config.sanmar.password,
        arg3: style,
        arg4: color,
        arg5: size,
    });

    const ret = resp?.return ?? {};
    if (sanmarReturnedError(ret)) {
        throw new Error(ret?.message ?? 'SanMar inventory request failed');
    }

    return { style, color, size, qty: sumInventoryQty(ret) };
}

/* ─── Product Info ────────────────────────────────────────────────────────── */

export interface SanMarProduct {
    style: string;
    title?: string;
    description?: string;
    colors?: string[];
    sizes?: string[];
    basePrice?: number;
    raw?: any;
}

/**
 * Fetch product information from SanMar's Product Info service.
 * Uses getProductInfoByStyleColorSize which accepts style alone or with color/size.
 * Auth pattern: nested object inside arg1 with senderId/senderPassword.
 */
export async function getSanMarProductInfo(
    style: string,
    color?: string,
    size?: string
): Promise<SanMarProduct> {
    if (!config.sanmar.enable) {
        return { style, dryRun: true } as any;
    }

    const wsdlUrl = config.sanmar.productInfoWsdlUrl;
    if (!wsdlUrl) throw new Error('SANMAR_PRODUCTINFO_WSDL_URL is required');
    if (!config.sanmar.customerNumber) throw new Error('SANMAR_CUSTOMER_NUMBER is required');

    const client = await soap.createClientAsync(wsdlUrl);

    const [resp] = await client.getProductInfoByStyleColorSizeAsync({
        arg0: {
            style,
            ...(color ? { color } : {}),
            ...(size ? { size } : {}),
        },
        arg1: {
            sanMarCustomerNumber: Number(config.sanmar.customerNumber),
            sanMarUserName: config.sanmar.username,
            sanMarUserPassword: config.sanmar.password,
            senderId: '',
            senderPassword: '',
        },
    });

    const ret = resp?.return ?? {};
    if (sanmarReturnedError(ret)) {
        throw new Error(ret?.message ?? 'SanMar product-info request failed');
    }

    const rows = asArray(ret.listResponse);
    const first = rows[0] ?? {};
    const basic = first.productBasicInfo ?? first;
    const price = first.productPriceInfo ?? {};

    return {
        style,
        title: basic?.productTitle,
        description: basic?.productDescription,
        colors: [...new Set(rows.map((r: any) => r?.productBasicInfo?.color).filter(Boolean))],
        sizes: [...new Set(rows.map((r: any) => r?.productBasicInfo?.size).filter(Boolean))],
        basePrice: price?.piecePrice ? Number(price.piecePrice) : undefined,
        raw: resp,
    };
}

/**
 * Looks up a style directly against SanMar's live Product Info API, bypassing
 * the local catalog entirely, and upserts every color/size variant it returns
 * into SanmarCatalogProduct (the same cache table the weekly SFTP sync fills).
 *
 * Why this exists: catalog search (GET /sanmar/catalog) only ever queries that
 * local cache, which is only as fresh as last week's sync file. A style SanMar
 * already sells but that hasn't made it into a sync yet (brand new, or added
 * mid-week) is invisible to search until the next sync — this is the same
 * "missing until it self-heals" gap that PO submission already works around
 * per-variant (see the mainframeColor live lookup above). This is that same
 * fix applied to search/browse, so search never depends on sync freshness.
 *
 * Returns the freshly-cached rows, or [] if SanMar has no record of the style
 * either (a typo, or it's simply not a real style code) — callers should treat
 * that the same as "not found" rather than as an error.
 */
export async function liveLookupAndCacheStyle(style: string): Promise<any[]> {
    let rows: any[];
    try {
        const info = await getSanMarProductInfo(style);
        rows = asArray((info.raw as any)?.return?.listResponse);
    } catch {
        return [];
    }
    if (rows.length === 0) return [];

    return Promise.all(rows.map((r: any) => {
        const basic = r?.productBasicInfo ?? {};
        const price = r?.productPriceInfo ?? {};
        const img = r?.productImageInfo ?? {};
        const colorName = basic.color ?? '';
        const sizeName = basic.size ?? '';
        const data = {
            title: basic.productTitle ?? null,
            description: basic.productDescription ?? null,
            brand: basic.brandName ?? null,
            category: basic.category ?? null,
            subcategory: basic.subcategory ?? null,
            priceCents: price.piecePrice ? Math.round(Number(price.piecePrice) * 100) : 0,
            inventoryKey: basic.inventoryKey ? String(basic.inventoryKey) : null,
            sizeIndex: basic.sizeIndex ? String(basic.sizeIndex) : null,
            mainframeColor: basic.catalogColor ?? null,
            colorSwatchImage: img.colorSwatchImage ?? null,
            productImage: img.colorProductImage ?? img.productImage ?? null,
        };
        return prisma.sanmarCatalogProduct.upsert({
            where: { style_colorName_sizeName: { style, colorName, sizeName } },
            create: { style, colorName, sizeName, ...data },
            update: data,
        });
    }));
}

/* ─── Order Status ────────────────────────────────────────────────────────── */

/**
 * PromoStandards Order Status V2.0.0 — query by PO number.
 * Auth: PromoStandards style (id + password, no customer number).
 * Call no more than 3x/day; wait 2 hours after PO submission before first call.
 */
export async function getOrderStatus(poNumber: string) {
    if (!config.sanmar.enable) return { dryRun: true };
    const wsdlUrl = config.sanmar.orderStatusWsdlUrl;
    if (!wsdlUrl) throw new Error('SANMAR_ORDER_STATUS_WSDL_URL is required');

    const client = await soap.createClientAsync(wsdlUrl);
    const [resp] = await client.getOrderStatusAsync({
        wsVersion: '2.0.0',
        id: config.sanmar.poUsername,
        password: config.sanmar.poPassword,
        queryType: 'poSearch',
        referenceNumber: poNumber,
        returnIssueDetailType: 'openIssues',
        returnProductDetail: true,
    });
    return resp;
}

/* ─── Order Shipment Notification ────────────────────────────────────────── */

/**
 * PromoStandards Order Shipment Notification V1.0.0 — query by PO number.
 * Auth: PromoStandards style (id + password).
 * Returns tracking number, carrier, ship date, and line items per package.
 */
export async function getOrderShipmentNotification(poNumber: string) {
    if (!config.sanmar.enable) return { dryRun: true };
    const wsdlUrl = config.sanmar.shipmentWsdlUrl;
    if (!wsdlUrl) throw new Error('SANMAR_SHIPMENT_WSDL_URL is required');

    const client = await soap.createClientAsync(wsdlUrl);
    const [resp] = await client.getOrderShipmentNotificationAsync({
        wsVersion: '1.0.0',
        id: config.sanmar.poUsername,
        password: config.sanmar.poPassword,
        queryType: '1',
        referenceNumber: poNumber,
    });
    return resp;
}

/* ─── Invoice ─────────────────────────────────────────────────────────────── */

/**
 * SanMar Standard Invoice Service — retrieve invoice by PO number.
 * Auth: standard SanMar (CustomerNo + UserName + Password).
 * SanMar invoices once/day after 9pm PT; pull the next day after 3pm PT.
 */
export async function getInvoiceByPO(poNumber: string) {
    if (!config.sanmar.enable) return { dryRun: true };
    const wsdlUrl = config.sanmar.invoiceWsdlUrl;
    if (!wsdlUrl) throw new Error('SANMAR_INVOICE_WSDL_URL is required');

    const client = await soap.createClientAsync(wsdlUrl);
    const [resp] = await client.GetInvoicesByPurchaseOrderNoAsync({
        CustomerNo: config.sanmar.customerNumber,
        UserName: config.sanmar.poUsername,
        Password: config.sanmar.poPassword,
        PurchaseOrderNo: poNumber,
    });
    return resp;
}

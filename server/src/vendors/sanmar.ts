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

    // Optional pre-submit availability check (non-fatal if it fails)
    try {
        await client.getPreSubmitInfoAsync({ arg0: poEnvelope, arg1: auth });
    } catch {
        // presubmit failures are non-fatal; submitPO often returns clearer messages
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
            select: { inventoryKey: true, sizeIndex: true },
        });

        const inventoryKey = variant?.inventoryKey ? Number(variant.inventoryKey) : null;
        const sizeIndex    = variant?.sizeIndex    ? Number(variant.sizeIndex)    : null;

        return {
            ...(inventoryKey && sizeIndex ? { inventoryKey, sizeIndex } : {}),
            style,
            color:    item.color    ?? '',
            size:     item.size     ?? '',
            quantity: Number(item.quantity),
            whseNo:   '',
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

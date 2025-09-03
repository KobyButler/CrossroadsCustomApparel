import { config } from '../config.js';
import soap from 'soap';

type LineGroup = Array<{
    item: any;
    product: { vendorIdentifier: string | null; sku: string };
}>;

export async function submitOrderToSanMar(order: any, lines: LineGroup) {
    if (!config.sanmar.enable) return { dryRun: true, note: 'SANMAR_ENABLE=false' };
    if (!config.sanmar.wsdlUrl) throw new Error('SANMAR_WSDL_URL is required');

    const client = await soap.createClientAsync(config.sanmar.wsdlUrl);

    // Optional availability check first
    try {
        const preReq = {
            arg0: buildPOEnvelope(order, lines),
            arg1: authArgs()
        };
        await client.getPreSubmitInfoAsync(preReq);
    } catch {
        // presubmit failures are non-fatal; submitPO often returns clearer messages
    }

    const req = {
        arg0: buildPOEnvelope(order, lines),
        arg1: authArgs()
    };
    const [resp] = await client.submitPOAsync(req);
    return { message: resp?.return?.message ?? 'Submitted', poNumber: order.id, raw: resp };
}

function buildPOEnvelope(order: any, lines: LineGroup) {
    return {
        attention: order.customerName,
        notes: '',
        poNum: order.id,
        shipTo: order.customerName,
        shipAddress1: order.shipAddress1,
        shipAddress2: order.shipAddress2 ?? '',
        shipCity: order.shipCity,
        shipState: order.shipState,
        shipZip: order.shipZip,
        shipMethod: 'UPS',
        shipEmail: order.customerEmail ?? 'noemail@example.com',
        residence: order.residential ? 'Y' : 'N',
        department: '',
        webServicePoDetailList: lines.map(({ item, product }) => ({
            inventoryKey: product.vendorIdentifier ?? '',
            sizeIndex: null,
            style: product.sku,
            color: item.color ?? '',
            size: item.size ?? '',
            quantity: item.quantity,
            whseNo: null
        }))
    };
}

function authArgs() {
    return {
        senderId: '',
        senderPassword: '',
        sanMarCustomerNumber: Number(config.sanmar.customerNumber || 0),
        sanMarUserName: config.sanmar.username,
        sanMarUserPassword: config.sanmar.password
    };
}

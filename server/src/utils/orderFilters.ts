// A card checkout creates its Order row up front — before the Stripe
// PaymentIntent actually succeeds — so the webhook has something to mark PAID
// once payment completes. If the customer never finishes paying (declined
// card, closed the tab, etc.), that row is left behind forever as
// paymentStatus UNPAID with nothing actually purchased. It's not a real sale,
// a real pending payment, or a real pickup/cash order — just a dead stub.
//
// Spread this into any `where` clause that treats Order rows as real business
// activity (the admin order list, revenue/analytics, vendor purchasing
// aggregation, shipping exports, the product-edit reconciliation check) so
// these never get counted as a sale, shipped, or bought-for from a vendor.
export const EXCLUDE_INCOMPLETE_CHECKOUTS = { NOT: { paymentStatus: 'UNPAID', paymentMethod: 'stripe' } } as const;

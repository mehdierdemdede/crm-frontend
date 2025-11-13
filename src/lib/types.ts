import { z } from "zod";

export const BillingPeriods = ["MONTH", "YEAR"] as const;
export type BillingPeriod = (typeof BillingPeriods)[number];

export const ZPrice = z.object({
    id: z.string(),
    amount: z.number().nonnegative(),
    currency: z.string().min(1),
    billingPeriod: z.enum(BillingPeriods),
    seatLimit: z.number().int().positive().nullable().optional(),
    trialDays: z.number().int().nonnegative().nullable().optional(),
});
export type Price = z.infer<typeof ZPrice>;

export const ZPlan = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    features: z.array(z.string()).optional().default([]),
    prices: z.array(ZPrice),
    metadata: z.record(z.any()).optional(),
});
export type Plan = z.infer<typeof ZPlan>;

export const ZCreatePlanPayload = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    features: z.array(z.string()).optional().default([]),
    prices: z.array(ZPrice),
    metadata: z.record(z.any()).optional(),
});
export type CreatePlanPayload = z.infer<typeof ZCreatePlanPayload>;

const subscriptionStatuses = [
    "TRIALING",
    "ACTIVE",
    "PAST_DUE",
    "CANCELED",
    "INCOMPLETE",
    "INCOMPLETE_EXPIRED",
] as const;

export const ZSubscription = z.object({
    id: z.string(),
    customerId: z.string(),
    planId: z.string(),
    priceId: z.string(),
    status: z.enum(subscriptionStatuses),
    seats: z.number().int().positive(),
    currentPeriodEnd: z.string(),
    cancelAtPeriodEnd: z.boolean().optional(),
    createdAt: z.string(),
    updatedAt: z.string().nullable().optional(),
    trialEndsAt: z.string().nullable().optional(),
    defaultPaymentMethodId: z.string().nullable().optional(),
});
export type Subscription = z.infer<typeof ZSubscription>;

const invoiceStatuses = [
    "DRAFT",
    "OPEN",
    "PAST_DUE",
    "PAID",
    "VOID",
    "UNCOLLECTIBLE",
] as const;

export const ZInvoice = z.object({
    id: z.string(),
    subscriptionId: z.string(),
    customerId: z.string(),
    status: z.enum(invoiceStatuses),
    amountDue: z.number().nonnegative(),
    amountPaid: z.number().nonnegative(),
    currency: z.string().min(1),
    issuedAt: z.string(),
    dueAt: z.string().nullable().optional(),
    pdfUrl: z.string().url().nullable().optional(),
    periodStart: z.string().nullable().optional(),
    periodEnd: z.string().nullable().optional(),
});
export type Invoice = z.infer<typeof ZInvoice>;

export const ZInvoiceLineItem = z.object({
    id: z.string(),
    description: z.string(),
    quantity: z.number().int().nonnegative().nullable().optional(),
    unitAmount: z.number().nonnegative().nullable().optional(),
    total: z.number().nonnegative(),
});
export type InvoiceLineItem = z.infer<typeof ZInvoiceLineItem>;

export const ZInvoiceDetail = ZInvoice.extend({
    customerName: z.string().nullable().optional(),
    lineItems: z.array(ZInvoiceLineItem).optional().default([]),
    notes: z.string().nullable().optional(),
});
export type InvoiceDetail = z.infer<typeof ZInvoiceDetail>;

export const ZPaymentMethod = z.object({
    id: z.string(),
    brand: z.string(),
    last4: z.string().length(4).regex(/^\d+$/),
    expMonth: z.number().int().min(1).max(12),
    expYear: z.number().int().min(2000).max(2100),
    isDefault: z.boolean().optional(),
    cardholderName: z.string().optional().nullable(),
    billingZip: z.string().optional().nullable(),
});
export type PaymentMethod = z.infer<typeof ZPaymentMethod>;

export const ZCard = z.object({
    cardholderName: z.string().min(1, "Kart üzerindeki isim gerekli"),
    cardNumber: z
        .string()
        .min(12)
        .max(19)
        .regex(/^\d+$/, "Kart numarası yalnızca rakamlardan oluşmalıdır"),
    expMonth: z.number().int().min(1).max(12),
    expYear: z.number().int().min(new Date().getFullYear()).max(2100),
    cvc: z.string().min(3).max(4).regex(/^\d+$/),
    billingZip: z.string().optional(),
});

export const ZCreateSubscription = z.object({
    customerId: z.string(),
    planId: z.string(),
    priceId: z.string(),
    seats: z.number().int().positive(),
    paymentMethodToken: z.string(),
    trialCouponCode: z.string().optional(),
});

export const ZChangePlan = z.object({
    planId: z.string(),
    priceId: z.string(),
});

export const SeatProrationOptions = ["IMMEDIATE", "AT_PERIOD_END"] as const;
export type SeatProration = (typeof SeatProrationOptions)[number];

export const ZUpdateSeats = z.object({
    seatCount: z.number().int().positive(),
    proration: z.enum(SeatProrationOptions),
});

export const ZCancelSub = z.object({
    cancelAtPeriodEnd: z.boolean().optional(),
    reason: z.string().max(500).optional(),
});

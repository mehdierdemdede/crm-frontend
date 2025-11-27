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
// `z.input` is used here so optional fields with defaults (e.g. features)
// remain compatible with the request schema typing expected by fetchJson.
export type CreatePlanPayload = z.input<typeof ZCreatePlanPayload>;

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

export const ZPublicSignupPayload = z.object({
    planId: z.string().min(1),
    billingPeriod: z.enum(BillingPeriods),
    seatCount: z.number().int().positive(),
    organizationName: z.string().min(2),
    organization: z
        .object({
            organizationName: z.string().trim().min(1).max(255),
            country: z
                .string()
                .trim()
                .transform((value) => value.toUpperCase())
                .refine((value) => /^[A-Z]{2,3}$/.test(value), {
                    message: "Ülke kodu 2 veya 3 harf olmalıdır",
                }),
            taxNumber: z.string().trim().min(1).max(50),
            companySize: z.string().trim().max(50).optional(),
        })
        .optional(),
    admin: z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        password: z.string().min(8).max(255).optional(),
    }),
    subscriptionId: z.string().optional(),
    iyzicoSubscriptionId: z.string().optional(),
    iyzicoCustomerId: z.string().optional(),
    inviteToken: z.string().optional(),
});
export type PublicSignupPayload = z.infer<typeof ZPublicSignupPayload>;

export const ZPublicSignupResponse = z
    .object({
        signupId: z.string().optional(),
        organizationId: z.string().optional(),
        adminUserId: z.string().optional(),
        adminEmail: z.string().email().optional(),
        inviteToken: z.string().optional(),
        inviteStatus: z.string().optional(),
        status: z.enum(["PENDING", "COMPLETED", "FAILED"]).optional(),
        message: z.string().optional(),
    })
    .passthrough();
export type PublicSignupResponse = z.infer<typeof ZPublicSignupResponse>;

export const ZPublicSignupPaymentPayload = z.object({
    planId: z.string().min(1),
    billingPeriod: z.enum(BillingPeriods),
    seatCount: z.number().int().min(1).max(200),
    account: z.object({
        firstName: z.string().trim().min(1).max(100),
        lastName: z.string().trim().min(1).max(100),
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(255),
        phone: z.string().trim().max(40).optional(),
    }),
    organization: z.object({
        organizationName: z.string().trim().min(1).max(255),
        country: z
            .string()
            .trim()
            .transform((value) => value.toUpperCase())
            .refine((value) => /^[A-Z]{2,3}$/.test(value), {
                message: "Ülke kodu 2 veya 3 harf olmalıdır",
            }),
        taxNumber: z.string().trim().min(1).max(50),
        companySize: z.string().trim().max(50).optional(),
    }),
    card: z.object({
        cardHolderName: z.string().trim().min(1).max(255),
        cardNumber: z.string().trim().regex(/^\d{12,19}$/),
        expireMonth: z.number().int().min(1).max(12),
        expireYear: z.number().int().min(2000).max(2100),
        cvc: z.string().trim().regex(/^\d{3,4}$/),
    }),
});
export type PublicSignupPaymentPayload = z.infer<typeof ZPublicSignupPaymentPayload>;

export const ZPublicSignupPaymentResponse = z.object({
    status: z.enum(["SUCCESS", "FAILURE"]),
    subscriptionId: z.string().nullish(),
    iyzicoSubscriptionId: z.string().nullish(),
    iyzicoCustomerId: z.string().nullish(),
    message: z.string().nullish(),
    hasTrial: z.boolean().optional(),
});
export type PublicSignupPaymentResponse = z.infer<typeof ZPublicSignupPaymentResponse>;

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

// Payment-related TypeScript types for better type safety

export interface PaymentConfig {
    stripeAPIKey: string;
    stripeWebhookSecret: string;
    stripePublishableKey?: string;
    stripeReturnUrl?: string;
}

export interface Customer {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
}

export interface SavedPaymentMethod {
    id: string;
    customerId: string;
    type: string;
    lastFour?: string;
    brand?: string;
    exp_month?: number;
    exp_year?: number;
    createdAt: Date;
}

export interface Payment {
    id: string;
    paymentIntentId: string;
    customerId?: string;
    amount: number;
    currency: string;
    status: "pending" | "processing" | "succeeded" | "failed" | "canceled";
    paymentMethod?: string;
    metadata?: Record<string, string>;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}

export interface PaymentWebhookEvent {
    type: "payment_intent.succeeded" | "payment_intent.payment_failed" | "charge.succeeded";
    paymentIntentId: string;
    amount?: number;
    currency?: string;
    status?: string;
    error?: string;
    timestamp: Date;
}

export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "canceled" | "requires_action" | "requires_payment_method" | "requires_confirmation";

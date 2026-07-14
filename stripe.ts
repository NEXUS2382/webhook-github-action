import Stripe from "stripe";

export interface PaymentRequest {
    amount: number;
    currency: string;
    customerId?: string;
    description?: string;
    paymentMethodTypes?: string[];
    metadata?: Record<string, string>;
}

export interface PaymentIntentResponse {
    id: string;
    clientSecret: string;
    status: string;
    amount: number;
    currency: string;
}

export interface InstantPaymentMethod {
    type: "us_bank_account" | "ach_debit" | "bancontact" | "sofort" | "ideal";
    description: string;
}

export const INSTANT_PAYMENT_METHODS: InstantPaymentMethod[] = [
    {
        type: "us_bank_account",
        description: "ACH Direct Debit (US)"
    },
    {
        type: "ach_debit",
        description: "ACH Debit"
    },
    {
        type: "ideal",
        description: "iDEAL (Netherlands)"
    },
    {
        type: "bancontact",
        description: "Bancontact (Belgium)"
    },
    {
        type: "sofort",
        description: "SOFORT (Europe)"
    }
];

export class StripePaymentProcessor {
    private stripe: Stripe;
    private webhookSecret: string;

    constructor(apiKey: string, webhookSecret: string) {
        this.stripe = new Stripe(apiKey, {
            apiVersion: "2024-06-20",
        });
        this.webhookSecret = webhookSecret;
    }

    /**
     * Create a payment intent for instant payments
     */
    async createInstantPayment(request: PaymentRequest): Promise<PaymentIntentResponse> {
        const paymentMethodTypes = request.paymentMethodTypes || [
            "us_bank_account",
            "card",
            "ideal",
            "bancontact",
            "sofort"
        ];

        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: request.amount,
            currency: request.currency.toLowerCase(),
            payment_method_types: paymentMethodTypes,
            description: request.description,
            metadata: {
                ...request.metadata,
                instantPayment: "true"
            },
            ...(request.customerId && { customer: request.customerId }),
            // Enable automatic confirmation for instant payments
            confirm: false,
            // Require payment method details
            statement_descriptor: "INSTANT PAYMENT",
        });

        return {
            id: paymentIntent.id,
            clientSecret: paymentIntent.client_secret || "",
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
        };
    }

    /**
     * Confirm payment intent (after payment method details are provided)
     */
    async confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<PaymentIntentResponse> {
        const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
            payment_method: paymentMethodId,
            return_url: process.env.STRIPE_RETURN_URL || "http://localhost:3001/payment-success",
        });

        return {
            id: paymentIntent.id,
            clientSecret: paymentIntent.client_secret || "",
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
        };
    }

    /**
     * Get payment intent details
     */
    async getPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResponse> {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

        return {
            id: paymentIntent.id,
            clientSecret: paymentIntent.client_secret || "",
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
        };
    }

    /**
     * Cancel a payment intent
     */
    async cancelPayment(paymentIntentId: string): Promise<PaymentIntentResponse> {
        const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);

        return {
            id: paymentIntent.id,
            clientSecret: paymentIntent.client_secret || "",
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
        };
    }

    /**
     * Create or get a customer
     */
    async getOrCreateCustomer(email: string, name: string): Promise<string> {
        // Search for existing customer
        const customers = await this.stripe.customers.list({ email });

        if (customers.data.length > 0) {
            return customers.data[0].id;
        }

        // Create new customer
        const customer = await this.stripe.customers.create({
            email,
            name,
        });

        return customer.id;
    }

    /**
     * Save a payment method to a customer
     */
    async savePaymentMethodToCustomer(
        customerId: string,
        paymentMethodId: string
    ): Promise<void> {
        await this.stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
        });
    }

    /**
     * List available instant payment methods
     */
    getAvailableInstantPaymentMethods(): InstantPaymentMethod[] {
        return INSTANT_PAYMENT_METHODS;
    }

    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(body: string, signature: string): Record<string, any> {
        return this.stripe.webhooks.constructEvent(body, signature, this.webhookSecret);
    }

    /**
     * Handle payment_intent.succeeded event
     */
    async handlePaymentSucceeded(event: Stripe.Event): Promise<void> {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment succeeded: ${paymentIntent.id}`);
        // Add custom logic here (e.g., update database, send confirmation email)
    }

    /**
     * Handle payment_intent.payment_failed event
     */
    async handlePaymentFailed(event: Stripe.Event): Promise<void> {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed: ${paymentIntent.id}`);
        // Add custom logic here (e.g., notify user, log failure)
    }

    /**
     * Handle charge.succeeded event
     */
    async handleChargeSucceeded(event: Stripe.Event): Promise<void> {
        const charge = event.data.object as Stripe.Charge;
        console.log(`Charge succeeded: ${charge.id}`);
        // Add custom logic here
    }
}

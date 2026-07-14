#!/usr/bin/env node

/**
 * API Usage Examples - Quick Reference
 * 
 * This file contains practical examples of how to use the Stripe payment API endpoints.
 * Copy and adapt these examples for your use case.
 */

// ============================================================================
// Example 1: Create a Payment Intent
// ============================================================================

async function exampleCreatePayment() {
    const response = await fetch('http://localhost:3001/payment/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            amount: 99.99,                    // Amount in dollars/euros
            currency: 'USD',                  // Currency code
            email: 'customer@example.com',    // Customer email
            name: 'John Doe',                 // Customer name
            description: 'Order #12345',      // Payment description
            metadata: {                       // Custom metadata
                orderId: '12345',
                serviceId: 'service_123',
                userId: 'user_456'
            }
        })
    });

    const data = await response.json();
    
    if (data.success) {
        console.log('Payment Intent Created:', data.paymentIntent);
        return data.paymentIntent;
    } else {
        console.error('Error:', data.error);
    }
}

// ============================================================================
// Example 2: Confirm a Payment with Payment Method
// ============================================================================

async function exampleConfirmPayment(paymentIntentId, paymentMethodId) {
    const response = await fetch('http://localhost:3001/payment/confirm', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            paymentIntentId: paymentIntentId,      // From createPayment
            paymentMethodId: paymentMethodId       // From Stripe Elements
        })
    });

    const data = await response.json();
    
    if (data.success) {
        console.log('Payment Confirmed:', data.paymentIntent);
        return data.paymentIntent;
    } else {
        console.error('Error:', data.error);
    }
}

// ============================================================================
// Example 3: Check Payment Status
// ============================================================================

async function exampleCheckPaymentStatus(paymentIntentId) {
    const response = await fetch(`http://localhost:3001/payment/status/${paymentIntentId}`);
    const data = await response.json();
    
    if (data.success) {
        const { status, amount, currency } = data.paymentIntent;
        console.log(`Payment ${status}:`, {
            amount: (amount / 100).toFixed(2),
            currency: currency.toUpperCase()
        });
        return data.paymentIntent;
    } else {
        console.error('Error:', data.error);
    }
}

// ============================================================================
// Example 4: Cancel a Payment
// ============================================================================

async function exampleCancelPayment(paymentIntentId) {
    const response = await fetch(`http://localhost:3001/payment/cancel/${paymentIntentId}`, {
        method: 'POST'
    });

    const data = await response.json();
    
    if (data.success) {
        console.log('Payment Canceled:', data.paymentIntent);
        return data.paymentIntent;
    } else {
        console.error('Error:', data.error);
    }
}

// ============================================================================
// Example 5: Get Available Payment Methods
// ============================================================================

async function exampleGetPaymentMethods() {
    const response = await fetch('http://localhost:3001/payment/methods');
    const data = await response.json();
    
    if (data.success) {
        console.log('Available Payment Methods:');
        data.methods.forEach(method => {
            console.log(`- ${method.type}: ${method.description}`);
        });
        return data.methods;
    } else {
        console.error('Error:', data.error);
    }
}

// ============================================================================
// Example 6: Using with Express/Node.js Backend
// ============================================================================

async function exampleBackendIntegration() {
    // In your Express route handler:
    
    // 1. Create payment intent
    const paymentIntent = await exampleCreatePayment();
    
    // 2. Send clientSecret to frontend
    return {
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
    };
}

// ============================================================================
// Example 7: Complete Payment Flow
// ============================================================================

async function exampleCompletePaymentFlow() {
    console.log('Starting payment flow...\n');

    // Step 1: Get available methods
    console.log('Step 1: Fetching available payment methods...');
    await exampleGetPaymentMethods();
    console.log('');

    // Step 2: Create payment intent
    console.log('Step 2: Creating payment intent...');
    const paymentIntent = await exampleCreatePayment();
    if (!paymentIntent) return;
    console.log('');

    // Step 3: Check status (requires_payment_method)
    console.log('Step 3: Checking payment status...');
    await exampleCheckPaymentStatus(paymentIntent.id);
    console.log('');

    // Step 4: Simulate payment method confirmation
    // Note: In real scenario, this comes from Stripe Elements after user enters details
    console.log('Step 4: Confirming payment (after user enters payment method)...');
    console.log('-> This would be done on the frontend with Stripe Elements');
    console.log('-> Payment method details are securely transmitted to Stripe\n');

    // Step 5: Check final status
    console.log('Step 5: Checking final payment status...');
    await exampleCheckPaymentStatus(paymentIntent.id);
    console.log('');

    console.log('✓ Payment flow example completed!');
}

// ============================================================================
// Example 8: Error Handling
// ============================================================================

async function exampleErrorHandling() {
    try {
        const response = await fetch('http://localhost:3001/payment/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: 100,
                currency: 'USD'
                // Missing email - might cause error
            })
        });

        const data = await response.json();

        if (!data.success) {
            console.error('API Error:', data.error);
            // Handle error appropriately
        }
    } catch (error) {
        console.error('Network Error:', error.message);
        // Handle network errors
    }
}

// ============================================================================
// Example 9: Retry Logic
// ============================================================================

async function exampleRetryLogic(fn, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            
            const delay = Math.pow(2, i) * 1000; // Exponential backoff
            console.log(`Attempt ${i + 1} failed, retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Usage:
// await exampleRetryLogic(() => exampleCreatePayment());

// ============================================================================
// Example 10: Payment Status Polling
// ============================================================================

async function examplePollPaymentStatus(paymentIntentId, maxAttempts = 10, interval = 2000) {
    for (let i = 0; i < maxAttempts; i++) {
        const paymentIntent = await exampleCheckPaymentStatus(paymentIntentId);
        
        if (paymentIntent.status === 'succeeded') {
            console.log('✓ Payment succeeded!');
            return paymentIntent;
        }
        
        if (['canceled', 'payment_failed'].includes(paymentIntent.status)) {
            console.log('✗ Payment failed or canceled');
            return paymentIntent;
        }

        if (i < maxAttempts - 1) {
            console.log(`Waiting ${interval}ms before next check...`);
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }

    console.log('⚠ Payment status still pending after max attempts');
}

// ============================================================================
// Example 11: Multi-Currency Handling
// ============================================================================

function exampleMultiCurrency(amount, currency) {
    const currencyConfig = {
        'USD': { symbol: '$', decimals: 2 },
        'EUR': { symbol: '€', decimals: 2 },
        'GBP': { symbol: '£', decimals: 2 },
        'JPY': { symbol: '¥', decimals: 0 },
        'CAD': { symbol: 'C$', decimals: 2 }
    };

    const config = currencyConfig[currency] || { symbol: currency, decimals: 2 };
    const formattedAmount = amount.toFixed(config.decimals);
    
    return `${config.symbol}${formattedAmount}`;
}

// Usage:
// console.log(exampleMultiCurrency(99.99, 'USD'));   // $99.99
// console.log(exampleMultiCurrency(99.99, 'EUR'));   // €99.99

// ============================================================================
// Example 12: Batch Payment Processing
// ============================================================================

async function exampleBatchPayments(payments) {
    const results = [];
    
    for (const payment of payments) {
        try {
            const intent = await exampleCreatePayment({
                amount: payment.amount,
                currency: payment.currency,
                email: payment.email,
                description: payment.description
            });
            
            results.push({
                ...payment,
                success: true,
                paymentIntentId: intent.id
            });
        } catch (error) {
            results.push({
                ...payment,
                success: false,
                error: error.message
            });
        }
    }

    return results;
}

// Usage:
// const payments = [
//     { amount: 50, currency: 'USD', email: 'user1@example.com', description: 'Order 1' },
//     { amount: 75, currency: 'EUR', email: 'user2@example.com', description: 'Order 2' }
// ];
// const results = await exampleBatchPayments(payments);

// ============================================================================
// Export Examples (for use in other modules)
// ============================================================================

module.exports = {
    exampleCreatePayment,
    exampleConfirmPayment,
    exampleCheckPaymentStatus,
    exampleCancelPayment,
    exampleGetPaymentMethods,
    exampleBackendIntegration,
    exampleCompletePaymentFlow,
    exampleErrorHandling,
    exampleRetryLogic,
    examplePollPaymentStatus,
    exampleMultiCurrency,
    exampleBatchPayments
};

// ============================================================================
// Run Examples (uncomment to run)
// ============================================================================

// Uncomment the desired example to run it:
// exampleCompletePaymentFlow().catch(console.error);
// exampleGetPaymentMethods().catch(console.error);
// exampleErrorHandling().catch(console.error);

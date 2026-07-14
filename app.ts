import {Octokit} from "@octokit/core";
import express, {NextFunction, Request, Response} from "express";
import {Webhook, WebhookUnbrandedRequiredHeaders, WebhookVerificationError} from "standardwebhooks"
import {RenderDeploy, RenderEvent, RenderService, WebhookPayload} from "./render";
import {StripePaymentProcessor, PaymentRequest} from "./stripe";
import Stripe from "stripe";

const app = express();
const port = process.env.PORT || 3001;
const renderWebhookSecret = process.env.RENDER_WEBHOOK_SECRET || '';

if (!renderWebhookSecret ) {
    console.error("Error: RENDER_WEBHOOK_SECRET is not set.");
    process.exit(1);
}

const renderAPIURL = process.env.RENDER_API_URL || "https://api.render.com/v1"

// To create a Render API token, follow instructions here: https://render.com/docs/api#1-create-an-api-key
const renderAPIToken = process.env.RENDER_API_KEY || '';

if (!renderAPIToken) {
    console.error("Error: RENDER_API_KEY is not set.");
    process.exit(1);
}

const githubAPIToken = process.env.GITHUB_API_TOKEN || '';
const githubOwnerName = process.env.GITHUB_OWNER_NAME || '';
const githubRepoName = process.env.GITHUB_REPO_NAME || '';

if (!githubAPIToken || !githubOwnerName || !githubRepoName) {
		console.error("Error: GITHUB_API_TOKEN, GITHUB_OWNER_NAME, or GITHUB_REPO_NAME is not set.");
		process.exit(1);
}

const githubWorkflowID = process.env.GITHUB_WORKFLOW_ID || 'example.yaml';

// Initialize Stripe Payment Processor
const stripeAPIKey = process.env.STRIPE_API_KEY || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

if (!stripeAPIKey) {
    console.error("Error: STRIPE_API_KEY is not set.");
    process.exit(1);
}

if (!stripeWebhookSecret) {
    console.error("Error: STRIPE_WEBHOOK_SECRET is not set.");
    process.exit(1);
}

const stripeProcessor = new StripePaymentProcessor(stripeAPIKey, stripeWebhookSecret);

const octokit = new Octokit({
    auth: githubAPIToken
})

app.use(express.json());

app.post("/webhook", express.raw({type: 'application/json'}), (req: Request, res: Response, next: NextFunction) => {
    try {
        validateWebhook(req);
    } catch (error) {
        return next(error)
    }

    const payload: WebhookPayload = JSON.parse(req.body)

    res.status(200).send({}).end()

    // handle the webhook async so we don't timeout the request
    handleWebhook(payload)
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    if (err instanceof WebhookVerificationError) {
        res.status(400).send({}).end()
    } else {
        res.status(500).send({}).end()
    }
});

app.get('/', (req: Request, res: Response) => {
  res.send('Render Webhook GitHub Action is listening!')
})

// ============ STRIPE PAYMENT ENDPOINTS ============

/**
 * GET /payment/methods
 * Get available instant payment methods
 */
app.get('/payment/methods', (req: Request, res: Response) => {
    try {
        const methods = stripeProcessor.getAvailableInstantPaymentMethods();
        res.status(200).json({
            success: true,
            methods
        });
    } catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payment methods'
        });
    }
});

/**
 * POST /payment/create
 * Create an instant payment intent
 * Body: { amount, currency, email?, name?, description?, metadata? }
 */
app.post('/payment/create', async (req: Request, res: Response) => {
    try {
        const { amount, currency, email, name, description, metadata } = req.body;

        if (!amount || !currency) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: amount, currency'
            });
        }

        // Get or create customer if email provided
        let customerId: string | undefined;
        if (email) {
            customerId = await stripeProcessor.getOrCreateCustomer(email, name || email);
        }

        const paymentRequest: PaymentRequest = {
            amount: Math.round(amount * 100), // Convert to cents
            currency,
            customerId,
            description: description || 'Instant Payment',
            paymentMethodTypes: ['us_bank_account', 'card', 'ideal', 'bancontact', 'sofort'],
            metadata
        };

        const paymentIntent = await stripeProcessor.createInstantPayment(paymentRequest);

        res.status(200).json({
            success: true,
            paymentIntent
        });
    } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create payment'
        });
    }
});

/**
 * POST /payment/confirm
 * Confirm a payment intent with a payment method
 * Body: { paymentIntentId, paymentMethodId }
 */
app.post('/payment/confirm', async (req: Request, res: Response) => {
    try {
        const { paymentIntentId, paymentMethodId } = req.body;

        if (!paymentIntentId || !paymentMethodId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: paymentIntentId, paymentMethodId'
            });
        }

        const paymentIntent = await stripeProcessor.confirmPayment(paymentIntentId, paymentMethodId);

        res.status(200).json({
            success: true,
            paymentIntent
        });
    } catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to confirm payment'
        });
    }
});

/**
 * GET /payment/status/:paymentIntentId
 * Get the status of a payment intent
 */
app.get('/payment/status/:paymentIntentId', async (req: Request, res: Response) => {
    try {
        const { paymentIntentId } = req.params;

        const paymentIntent = await stripeProcessor.getPaymentIntent(paymentIntentId);

        res.status(200).json({
            success: true,
            paymentIntent
        });
    } catch (error) {
        console.error('Error fetching payment status:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch payment status'
        });
    }
});

/**
 * POST /payment/cancel/:paymentIntentId
 * Cancel a payment intent
 */
app.post('/payment/cancel/:paymentIntentId', async (req: Request, res: Response) => {
    try {
        const { paymentIntentId } = req.params;

        const paymentIntent = await stripeProcessor.cancelPayment(paymentIntentId);

        res.status(200).json({
            success: true,
            paymentIntent
        });
    } catch (error) {
        console.error('Error canceling payment:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to cancel payment'
        });
    }
});

/**
 * POST /webhook/stripe
 * Handle Stripe webhook events
 */
app.post('/webhook/stripe', express.raw({type: 'application/json'}), async (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['stripe-signature'] as string;

    try {
        const event = stripeProcessor.verifyWebhookSignature(
            typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
            signature
        );

        console.log(`Received Stripe webhook event: ${event.type}`);

        // Handle specific event types
        switch (event.type) {
            case 'payment_intent.succeeded':
                await stripeProcessor.handlePaymentSucceeded(event);
                break;
            case 'payment_intent.payment_failed':
                await stripeProcessor.handlePaymentFailed(event);
                break;
            case 'charge.succeeded':
                await stripeProcessor.handleChargeSucceeded(event);
                break;
            default:
                console.log(`Unhandled Stripe event type: ${event.type}`);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook signature verification failed:', error);
        res.status(400).send('Webhook Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
});

/**
 * GET /payment-success
 * Redirect page after successful instant payment
 */
app.get('/payment-success', (req: Request, res: Response) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Successful</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .success { color: green; font-size: 24px; }
            </style>
        </head>
        <body>
            <div class="success">✓ Payment Successful!</div>
            <p>Your instant payment has been processed successfully.</p>
            <a href="/">Back to Home</a>
        </body>
        </html>
    `);
});

// ============ END STRIPE ENDPOINTS ============

const server = app.listen(port, () => console.log(`Example app listening on port ${port}!`));

function validateWebhook(req: Request) {
    const headers: WebhookUnbrandedRequiredHeaders = {
        "webhook-id": req.header("webhook-id") || "",
        "webhook-timestamp": req.header("webhook-timestamp") || "",
        "webhook-signature": req.header("webhook-signature") || ""
    }

    const wh = new Webhook(renderWebhookSecret);
    wh.verify(req.body, headers);
}

async function handleWebhook(payload: WebhookPayload) {
    try {
        switch (payload.type) {
            case "deploy_ended":
                console.log("handling deploy_ended event")
                const event = await fetchEventInfo(payload)

                // TODO add human readable status
                if (event.details.status != 2) {
                    console.log(`deploy ended for service ${payload.data.serviceId} with unsuccessful status`)
                    return
                }

                const deploy = await fetchDeployInfo(payload.data.serviceId, event.details.deployId)
                if (!deploy.commit) {
                    console.log(`ignoring deploy success for image backed service: ${payload.data.serviceId}`)
                    return
                }

                const service = await fetchServiceInfo(payload)

                if (! service.repo.includes(`${githubOwnerName}/${githubRepoName}`)) {
                    console.log(`ignoring deploy success for another service: ${service.name}`)
                    return
                }

                console.log(`triggering github workflow for ${githubOwnerName}/${githubRepoName} for ${service.name}`)
                await triggerWorkflow(service.id, service.branch)
                return
            default:
                console.log(`unhandled webhook type ${payload.type} for service ${payload.data.serviceId}`)
        }
    } catch (error) {
        console.error(error)
    }
}

async function triggerWorkflow(serviceID: string, branch: string) {
    await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
        owner: githubOwnerName,
        repo: githubRepoName,
        workflow_id: githubWorkflowID,
        ref: branch,
        inputs: {
            serviceID: serviceID
        },
        headers: {
            'X-GitHub-Api-Version': '2022-11-28'
        }
    })
}

// fetchEventInfo fetches the event that triggered the webhook
// some events have additional information that isn't in the webhook payload
// for example, deploy events have the deploy id
async function fetchEventInfo(payload: WebhookPayload): Promise<RenderEvent> {
    const url = `${renderAPIURL}/events/${payload.data.id}`
		console.log(`fetching event info at ${url}`)
    const res = await fetch(
        url,
        {
            method: "GET",
            headers: {
                accept: "application/json",
                authorization: `Bearer ${renderAPIToken}`,
            },
        },
    )

    if (res.ok) {
        return res.json()
    } else {
        throw new Error(`unable to fetch event info; received code ${res.status.toString()}`)
    }
}

async function fetchDeployInfo(serviceId: string, deployId: string): Promise<RenderDeploy> {
    const res = await fetch(
        `${renderAPIURL}/services/${serviceId}/deploys/${deployId}`,
        {
            method: "get",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${renderAPIToken}`,
            },
        },
    )
    if (res.ok) {
        return res.json()
    } else {
        throw new Error(`unable to fetch deploy info; received code :${res.status.toString()}`)
    }
}

async function fetchServiceInfo(payload: WebhookPayload): Promise<RenderService> {
    const res = await fetch(
        `${renderAPIURL}/services/${payload.data.serviceId}`,
        {
            method: "get",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${renderAPIToken}`,
            },
        },
    )
    if (res.ok) {
        return res.json()
    } else {
        throw new Error(`unable to fetch service info; received code :${res.status.toString()}`)
    }
}

process.on('SIGTERM', () => {
    console.debug('SIGTERM signal received: closing HTTP server')
    server.close(() => {
        console.debug('HTTP server closed')
    })
})

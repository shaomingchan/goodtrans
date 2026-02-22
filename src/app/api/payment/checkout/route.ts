import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20',
});

const PRICING_PLANS = {
  monthly: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID || '',
    name: 'Monthly Plan',
    amount: 1200, // $12.00
    currency: 'usd',
  },
  annual: {
    priceId: process.env.STRIPE_ANNUAL_PRICE_ID || '',
    name: 'Annual Plan',
    amount: 12000, // $120.00
    currency: 'usd',
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planType, email } = body;

    if (!planType || !['monthly', 'annual'].includes(planType)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    const plan = PRICING_PLANS[planType as keyof typeof PRICING_PLANS];

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: plan.currency,
            product_data: {
              name: plan.name,
              description: `GoodTrans ${plan.name}`,
            },
            unit_amount: plan.amount,
            recurring:
              planType === 'monthly'
                ? { interval: 'month' }
                : { interval: 'year' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      customer_email: email,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Stripe error:', error);
    return NextResponse.json(
      { error: 'Payment session creation failed', details: String(error) },
      { status: 500 }
    );
  }
}

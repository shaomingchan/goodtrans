import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2025-08-27.basil' });
}

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
    const { packageType, email } = body;

    if (!packageType || !['pay-as-you-go', '10k-words', '100k-words'].includes(packageType)) {
      return NextResponse.json(
        { error: 'Invalid package type' },
        { status: 400 }
      );
    }

    const packages = {
      'pay-as-you-go': {
        name: 'Pay as you go',
        description: '$0.05 per word',
        amount: 0, // No upfront charge
      },
      '10k-words': {
        name: '10K Words Package',
        description: '10,000 words for $399',
        amount: 39900, // $399.00
      },
      '100k-words': {
        name: '100K Words Package',
        description: '100,000 words for $1,999',
        amount: 199900, // $1,999.00
      },
    };

    const pkg = packages[packageType as keyof typeof packages];

    // For pay-as-you-go, no checkout needed
    if (packageType === 'pay-as-you-go') {
      return NextResponse.json({
        success: true,
        message: 'Ready to translate. Charges will be applied per word at $0.05/word',
      });
    }

    // Create checkout session for packages
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: pkg.name,
              description: pkg.description,
            },
            unit_amount: pkg.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
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

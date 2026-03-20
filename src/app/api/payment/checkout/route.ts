import { NextRequest } from 'next/server';
import Stripe from 'stripe';

import { envConfigs } from '@/config';
import { PaymentType } from '@/extensions/payment/types';
import { respData, respErr } from '@/shared/lib/resp';
import { getSnowId, getUuid } from '@/shared/lib/hash';
import {
  createOrder,
  OrderStatus,
  updateOrderByOrderNo,
} from '@/shared/models/order';
import { getUserInfo } from '@/shared/models/user';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, { apiVersion: '2025-08-27.basil' });
}

const PACKAGES = {
  'pay-as-you-go': {
    name: 'Pay as you go',
    description: '$0.05 per word',
    amount: 0,
    currency: 'usd',
  },
  '10k-words': {
    name: '10K Words Package',
    description: '10,000 words package',
    amount: 39900,
    currency: 'usd',
  },
  '100k-words': {
    name: '100K Words Package',
    description: '100,000 words package',
    amount: 199900,
    currency: 'usd',
  },
} as const;

export async function POST(request: NextRequest) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return Response.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const packageType = body.packageType || body.product_id;
    const email = body.email || user.email;

    if (
      !packageType ||
      !['pay-as-you-go', '10k-words', '100k-words'].includes(packageType)
    ) {
      return respErr('Invalid package type');
    }

    const pkg = PACKAGES[packageType as keyof typeof PACKAGES];

    if (packageType === 'pay-as-you-go') {
      return respData({
        message:
          'Ready to translate. Charges will be applied per word at $0.05/word',
      });
    }

    const orderNo = getSnowId();
    const now = new Date();

    await createOrder({
      id: getUuid(),
      orderNo,
      userId: user.id,
      userEmail: user.email,
      status: OrderStatus.PENDING,
      amount: pkg.amount,
      currency: pkg.currency,
      productId: packageType,
      paymentType: PaymentType.ONE_TIME,
      paymentProvider: 'stripe',
      checkoutInfo: JSON.stringify({
        packageType,
        email,
      }),
      createdAt: now,
      productName: pkg.name,
      description: pkg.description,
      callbackUrl: `${envConfigs.app_url}/settings/payments`,
    });

    const callbackBaseParams = `order_no=${orderNo}`;
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: pkg.currency,
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
      success_url: `${envConfigs.app_url}/api/payment/callback?${callbackBaseParams}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${envConfigs.app_url}/pricing?${callbackBaseParams}&canceled=1`,
      customer_email: email,
      metadata: {
        order_no: orderNo,
      },
    });

    await updateOrderByOrderNo(orderNo, {
      status: OrderStatus.CREATED,
      paymentSessionId: session.id,
      checkoutUrl: session.url,
      checkoutResult: JSON.stringify(session),
    });

    return respData({
      orderNo,
      sessionId: session.id,
      checkoutUrl: session.url,
      url: session.url,
    });
  } catch (error) {
    console.error('Stripe error:', error);
    return respErr(
      `Payment session creation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

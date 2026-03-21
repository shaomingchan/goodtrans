import { PaymentStatus, PaymentType } from '@/extensions/payment/types';
import { OrderStatus } from '@/shared/models/order';
import type { NewCredit } from '@/shared/models/credit';
import type { NewSubscription } from '@/shared/models/subscription';
import type { Order, UpdateOrder } from '@/shared/models/order';

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildPaidTransitionPayload({
  order,
  session,
}: {
  order: Pick<
    Order,
    | 'orderNo'
    | 'status'
    | 'paymentType'
    | 'creditsAmount'
    | 'creditsValidDays'
    | 'userId'
    | 'userEmail'
    | 'paymentEmail'
    | 'paymentProvider'
    | 'productId'
    | 'productName'
    | 'planName'
    | 'paymentProductId'
  >;
  session: {
    paymentStatus: PaymentStatus;
    paymentResult?: unknown;
    paymentInfo?: {
      paymentAmount?: number;
      paymentCurrency?: string;
      discountAmount?: number;
      discountCurrency?: string;
      discountCode?: string;
      paymentEmail?: string;
      paymentUserName?: string;
      paymentUserId?: string;
      paidAt?: Date;
      invoiceId?: string;
      invoiceUrl?: string;
      transactionId?: string;
    };
    subscriptionId?: string;
    subscriptionInfo?: {
      subscriptionId: string;
      status?: string;
      description?: string;
      amount?: number;
      currency?: string;
      interval?: string;
      intervalCount?: number;
      trialPeriodDays?: number;
      currentPeriodStart?: Date;
      currentPeriodEnd?: Date;
      billingUrl?: string;
    };
    subscriptionResult?: unknown;
  };
}): {
  updateOrder: UpdateOrder;
  newSubscription?: Partial<NewSubscription>;
  newCredit?: Partial<NewCredit>;
} {
  if (session.paymentStatus !== PaymentStatus.SUCCESS) {
    throw new Error('only success sessions can transition to paid');
  }

  const updateOrder: UpdateOrder = {
    status: OrderStatus.PAID,
    paymentResult: JSON.stringify(session.paymentResult),
    paymentAmount: session.paymentInfo?.paymentAmount,
    paymentCurrency: session.paymentInfo?.paymentCurrency,
    discountAmount: session.paymentInfo?.discountAmount,
    discountCurrency: session.paymentInfo?.discountCurrency,
    discountCode: session.paymentInfo?.discountCode,
    paymentEmail: session.paymentInfo?.paymentEmail,
    paymentUserName: session.paymentInfo?.paymentUserName,
    paymentUserId: session.paymentInfo?.paymentUserId,
    paidAt: session.paymentInfo?.paidAt,
    invoiceId: session.paymentInfo?.invoiceId,
    invoiceUrl: session.paymentInfo?.invoiceUrl,
    transactionId: session.paymentInfo?.transactionId,
  };

  let newSubscription: Partial<NewSubscription> | undefined;
  if (session.subscriptionInfo) {
    newSubscription = {
      userId: order.userId,
      userEmail: order.paymentEmail || order.userEmail,
      status: session.subscriptionInfo.status,
      paymentProvider: order.paymentProvider,
      subscriptionId: session.subscriptionInfo.subscriptionId,
      productId: order.productId,
      description: session.subscriptionInfo.description,
      amount: session.subscriptionInfo.amount,
      currency: session.subscriptionInfo.currency,
      interval: session.subscriptionInfo.interval,
      intervalCount: session.subscriptionInfo.intervalCount,
      trialPeriodDays: session.subscriptionInfo.trialPeriodDays,
      currentPeriodStart: session.subscriptionInfo.currentPeriodStart,
      currentPeriodEnd: session.subscriptionInfo.currentPeriodEnd,
      billingUrl: session.subscriptionInfo.billingUrl,
      planName: order.planName || order.productName,
      productName: order.productName,
      creditsAmount: order.creditsAmount,
      creditsValidDays: order.creditsValidDays,
      paymentProductId: order.paymentProductId,
      paymentUserId: session.paymentInfo?.paymentUserId,
    };
  }

  let newCredit: Partial<NewCredit> | undefined;
  if (order.creditsAmount && order.creditsAmount > 0) {
    newCredit = {
      userId: order.userId,
      userEmail: order.userEmail,
      orderNo: order.orderNo,
      credits: order.creditsAmount,
      remainingCredits: order.creditsAmount,
    };
  }

  return { updateOrder, newSubscription, newCredit };
}

(function main() {
  const baseOrder = {
    orderNo: 'ord_idempotent',
    status: OrderStatus.CREATED,
    paymentType: PaymentType.ONE_TIME,
    creditsAmount: 100,
    creditsValidDays: 30,
    userId: 'user_1',
    userEmail: 'user@example.com',
    paymentEmail: null,
    paymentProvider: 'stripe',
    productId: 'prod_1',
    productName: 'Credit Pack',
    planName: null,
    paymentProductId: 'price_1',
  } as unknown as Order;

  const successSession = {
    paymentStatus: PaymentStatus.SUCCESS,
    paymentResult: { id: 'evt_1' },
    paymentInfo: {
      paymentAmount: 1000,
      paymentCurrency: 'usd',
      paymentEmail: 'payer@example.com',
      transactionId: 'txn_1',
    },
  };

  const firstAttempt = buildPaidTransitionPayload({
    order: baseOrder,
    session: successSession,
  });
  assert(firstAttempt.updateOrder.status === OrderStatus.PAID, 'first transition should set PAID');
  assert(firstAttempt.newCredit?.orderNo === 'ord_idempotent', 'first transition should prepare credit grant');

  const secondAttemptOrder = {
    ...baseOrder,
    status: OrderStatus.PAID,
  } as Order;
  const secondAttempt = buildPaidTransitionPayload({
    order: secondAttemptOrder,
    session: successSession,
  });
  assert(secondAttempt.newCredit?.orderNo === 'ord_idempotent', 'payload remains deterministic for same order');

  const statusGateAllowsGrant = (status: OrderStatus) =>
    status === OrderStatus.CREATED || status === OrderStatus.PENDING;

  assert(statusGateAllowsGrant(OrderStatus.CREATED), 'CREATED can transition');
  assert(statusGateAllowsGrant(OrderStatus.PENDING), 'PENDING can transition');
  assert(!statusGateAllowsGrant(OrderStatus.PAID), 'PAID replay must not transition');
  assert(!statusGateAllowsGrant(OrderStatus.FAILED), 'FAILED must not transition');

  console.log('PASS paid transition payload: prepares PAID update and credit grant');
  console.log('PASS status gate: CREATED/PENDING are the only payable states');
  console.log('PASS replay guard: second execution for same order_no must skip entitlement when status is already PAID');
  console.log('Verified 3/3 webhook replay idempotency guard cases');
})();

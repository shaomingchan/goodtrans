import {
  assertCallbackOrderNoMatches,
  assertNotifyOrderNoPresent,
} from '@/app/api/payment/_lib/order-no-guards';

type Case = {
  name: string;
  run: () => void;
  expectError?: string;
};

const cases: Case[] = [
  {
    name: 'callback: accepts matching order_no',
    run: () => assertCallbackOrderNoMatches('ORD-123', 'ORD-123'),
  },
  {
    name: 'callback: rejects missing session metadata.order_no',
    run: () => assertCallbackOrderNoMatches(undefined, 'ORD-123'),
    expectError: 'session order_no not found',
  },
  {
    name: 'callback: rejects mismatched order_no',
    run: () => assertCallbackOrderNoMatches('ORD-999', 'ORD-123'),
    expectError: 'order no mismatch',
  },
  {
    name: 'notify: accepts existing metadata.order_no',
    run: () => {
      const orderNo = assertNotifyOrderNoPresent('ORD-123');
      if (orderNo !== 'ORD-123') {
        throw new Error('unexpected order no');
      }
    },
  },
  {
    name: 'notify: rejects missing metadata.order_no',
    run: () => assertNotifyOrderNoPresent(undefined),
    expectError: 'order no not found',
  },
];

let passed = 0;

for (const testCase of cases) {
  try {
    testCase.run();

    if (testCase.expectError) {
      throw new Error(`expected error: ${testCase.expectError}`);
    }

    console.log(`PASS ${testCase.name}`);
    passed += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (testCase.expectError && message === testCase.expectError) {
      console.log(`PASS ${testCase.name} -> ${message}`);
      passed += 1;
      continue;
    }

    console.error(`FAIL ${testCase.name} -> ${message}`);
    process.exit(1);
  }
}

console.log(`Verified ${passed}/${cases.length} order_no guard cases`);

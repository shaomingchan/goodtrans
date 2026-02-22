'use client';

import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Check } from 'lucide-react';

const PRICING_PLANS = [
  {
    name: 'Pay as you go',
    price: '$0.72',
    period: 'per 1M characters',
    description: 'Perfect for occasional translations',
    features: [
      'Unlimited translations',
      'All 50+ languages',
      'Markdown & PDF export',
      'Claude 3.5 Sonnet quality',
      'No monthly commitment',
    ],
    cta: 'Start Translating',
    highlighted: false,
  },
  {
    name: 'Monthly Plan',
    price: '$12',
    period: 'per month',
    description: 'Best for regular users',
    features: [
      '6M characters/month',
      'All 50+ languages',
      'Markdown & PDF export',
      'Claude 3.5 Sonnet quality',
      'Overage: $0.72/1M chars',
      '40% savings vs pay-as-you-go',
    ],
    cta: 'Subscribe Now',
    highlighted: true,
  },
  {
    name: 'Annual Plan',
    price: '$120',
    period: 'per year',
    description: 'Best value for power users',
    features: [
      '72M characters/year',
      'All 50+ languages',
      'Markdown & PDF export',
      'Claude 3.5 Sonnet quality',
      'Overage: $0.72/1M chars',
      '17% savings vs monthly',
    ],
    cta: 'Subscribe Now',
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600">Choose the plan that works for you</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={`flex flex-col ${plan.highlighted ? 'border-2 border-indigo-500 shadow-lg' : ''}`}
            >
              {plan.highlighted && (
                <div className="bg-indigo-500 px-4 py-2 text-center text-sm font-semibold text-white">
                  Most Popular
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <div className="mb-6">
                  <div className="text-4xl font-bold text-gray-900">{plan.price}</div>
                  <div className="text-sm text-gray-600">{plan.period}</div>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.highlighted
                      ? 'bg-indigo-500 hover:bg-indigo-600'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 rounded-lg bg-white p-8 text-center shadow">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Questions?</h2>
          <p className="mb-6 text-gray-600">
            Contact us at support@goodtrans.app or check our FAQ
          </p>
          <Button variant="outline">View FAQ</Button>
        </div>
      </div>
    </div>
  );
}

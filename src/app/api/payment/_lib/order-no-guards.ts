export function assertCallbackOrderNoMatches(
  sessionOrderNo: string | null | undefined,
  callbackOrderNo: string
) {
  if (!sessionOrderNo) {
    throw new Error('session order_no not found');
  }

  if (sessionOrderNo !== callbackOrderNo) {
    throw new Error('order no mismatch');
  }
}

export function assertNotifyOrderNoPresent(
  sessionOrderNo: string | null | undefined
) {
  if (!sessionOrderNo) {
    throw new Error('order no not found');
  }

  return sessionOrderNo;
}

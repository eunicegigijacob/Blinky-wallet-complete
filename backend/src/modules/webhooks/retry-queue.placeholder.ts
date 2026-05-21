export interface RetryJob {
  eventId: string;
  paymentHash: string;
  attempt: number;
  lastError?: string;
}

// Placeholder queue adapter for workshop discussion.
// In production, wire this to BullMQ, SQS, or RabbitMQ.
export function enqueueRetry(job: RetryJob) {
  return { queued: true, ...job };
}

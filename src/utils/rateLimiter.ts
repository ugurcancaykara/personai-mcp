import PQueue from 'p-queue';

export class RateLimiter {
  private queue: PQueue;
  private requestsPerMinute: number;
  private burstLimit: number;

  constructor(requestsPerMinute: number = 60, burstLimit: number = 15) {
    this.requestsPerMinute = requestsPerMinute;
    this.burstLimit = burstLimit;

    // Configure the queue with rate limiting
    this.queue = new PQueue({
      concurrency: this.burstLimit,
      interval: 60000, // 1 minute
      intervalCap: this.requestsPerMinute
    });
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.queue.add(fn) as Promise<T>;
  }

  get size(): number {
    return this.queue.size;
  }

  get pending(): number {
    return this.queue.pending;
  }

  clear(): void {
    this.queue.clear();
  }

  async onEmpty(): Promise<void> {
    return this.queue.onEmpty();
  }
}
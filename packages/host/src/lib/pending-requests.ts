import type { LLMResponse } from '../types';

/**
 * Tracks in-flight LLM requests to prevent duplicate calls
 * for the same input across concurrent requests.
 *
 * When multiple requests arrive with identical cacheKey,
 * only the first request executes the LLM call.
 * Subsequent requests await the same Promise.
 */
export class PendingRequestTracker {
  private pending = new Map<string, Promise<LLMResponse>>();

  /**
   * Get existing pending request or execute a new one
   *
   * @param cacheKey - Unique identifier for the request
   * @param executor - Function that performs the LLM call
   * @param force - If true, skip deduplication and execute directly
   * @returns LLMResponse from either existing or new request
   */
  async getOrExecute(
    cacheKey: string,
    executor: () => Promise<LLMResponse>,
    force: boolean = false
  ): Promise<LLMResponse> {
    // If force=true, bypass deduplication and execute directly
    if (force) {
      return await executor();
    }

    // Check for existing in-flight request
    const existing = this.pending.get(cacheKey);
    if (existing) {
      console.log(`[PendingTracker] Deduplicating request for cacheKey: ${cacheKey.substring(0, 16)}...`);
      return await existing;
    }

    // Execute new request
    const promise = executor();
    this.pending.set(cacheKey, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      // Always cleanup, even on error
      this.pending.delete(cacheKey);
    }
  }

  /**
   * Get count of pending requests (for monitoring/debugging)
   */
  getPendingCount(): number {
    return this.pending.size;
  }

  /**
   * Get all pending cache keys (for monitoring/debugging)
   */
  getPendingKeys(): string[] {
    return Array.from(this.pending.keys());
  }
}

// Export singleton instance
export const pendingTracker = new PendingRequestTracker();

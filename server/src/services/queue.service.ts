import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';

/**
 * Queue Service for managing webhook processing with BullMQ
 *
 * Architecture:
 * - Webhooks are added to queue immediately upon receipt
 * - Worker processes jobs from queue with concurrency control
 * - Automatic retries with exponential backoff
 * - Redis-based for horizontal scalability
 */

// Webhook job data structure
export interface WebhookJob {
  webhookId: string;
  event: string;
  payload: any;
  receivedAt: string;
}

class QueueService {
  private connection: Redis;
  private webhookQueue: Queue<WebhookJob>;
  private queueEvents: QueueEvents;
  private worker: Worker<WebhookJob> | null = null;

  constructor() {
    // Initialize Redis connection
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });

    // Initialize webhook queue
    this.webhookQueue = new Queue<WebhookJob>('webhooks', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 1000, // Start with 1 second, doubles each retry
        },
        removeOnComplete: 100, // Keep last 100 completed jobs for debugging
        removeOnFail: 500, // Keep last 500 failed jobs for analysis
      },
    });

    // Queue events for monitoring
    this.queueEvents = new QueueEvents('webhooks', {
      connection: this.connection,
    });

    // Event listeners for monitoring
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for queue monitoring
   */
  private setupEventListeners(): void {
    this.queueEvents.on('completed', ({ jobId }) => {
      console.log(`[Queue] Job ${jobId} completed successfully`);
    });

    this.queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.error(`[Queue] Job ${jobId} failed: ${failedReason}`);
    });

    // Note: 'retrying' is not a standard QueueEvents event in BullMQ
    // Retry behavior is handled automatically by the queue configuration
  }

  /**
   * Add webhook to processing queue
   * @param webhookData - The webhook job data
   * @returns Job ID
   */
  async addWebhookJob(webhookData: WebhookJob): Promise<string> {
    const job = await this.webhookQueue.add('process-webhook', webhookData, {
      jobId: webhookData.webhookId, // Use webhook ID as job ID for deduplication
    });
    console.log(`[Queue] Added webhook job ${job.id} (event: ${webhookData.event})`);
    return job.id!;
  }

  /**
   * Start webhook worker
   * @param processor - Function to process webhook jobs
   */
  startWorker(processor: (job: WebhookJob) => Promise<void>): void {
    const concurrency = parseInt(
      process.env.WEBHOOK_QUEUE_CONCURRENCY || '10',
      10
    );

    this.worker = new Worker<WebhookJob>(
      'webhooks',
      async (job) => {
        console.log(
          `[Worker] Processing webhook job ${job.id} (event: ${job.data.event})`
        );
        await processor(job.data);
      },
      {
        connection: this.connection,
        concurrency,
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`[Worker] Completed job ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[Worker] Failed job ${job?.id}:`, err.message);
    });

    console.log(`[Queue] Worker started with concurrency ${concurrency}`);
  }

  /**
   * Stop worker and close connections gracefully
   */
  async shutdown(): Promise<void> {
    console.log('[Queue] Shutting down gracefully...');

    // Close worker
    if (this.worker) {
      await this.worker.close();
      console.log('[Queue] Worker closed');
    }

    // Close queue events
    await this.queueEvents.close();
    console.log('[Queue] Queue events closed');

    // Close queue
    await this.webhookQueue.close();
    console.log('[Queue] Queue closed');

    // Close Redis connection
    await this.connection.quit();
    console.log('[Queue] Redis connection closed');
  }

  /**
   * Get queue health status
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    queueName: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.webhookQueue.getWaitingCount(),
        this.webhookQueue.getActiveCount(),
        this.webhookQueue.getCompletedCount(),
        this.webhookQueue.getFailedCount(),
      ]);

      return {
        isHealthy: true,
        queueName: 'webhooks',
        waiting,
        active,
        completed,
        failed,
      };
    } catch (error) {
      return {
        isHealthy: false,
        queueName: 'webhooks',
        waiting: -1,
        active: -1,
        completed: -1,
        failed: -1,
      };
    }
  }

  /**
   * Check if Redis connection is alive
   */
  async isRedisConnected(): Promise<boolean> {
    try {
      await this.connection.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const queueService = new QueueService();

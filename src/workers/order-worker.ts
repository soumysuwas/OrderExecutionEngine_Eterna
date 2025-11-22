import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';
import orderExecutor from '../services/order-executor';
import { CreateOrderDto } from '../types';

// Create Redis connection for worker - use REDIS_URL if available (Render), otherwise use individual config (local)
const connection = config.redis.url
    ? new Redis(config.redis.url, {
        maxRetriesPerRequest: null,
    })
    : new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        maxRetriesPerRequest: null,
    });

/**
 * Process order execution jobs
 */
async function processOrder(job: Job): Promise<void> {
    const { orderId, tokenIn, tokenOut, amount } = job.data;

    console.log(`[Worker] Processing order ${orderId} (Attempt ${job.attemptsMade + 1}/${job.opts.attempts})`);

    const orderData: CreateOrderDto = {
        tokenIn,
        tokenOut,
        amount,
    };

    // Update job progress
    await job.updateProgress(10);

    // Execute the order
    await orderExecutor.executeOrder(orderId, orderData);

    await job.updateProgress(100);

    console.log(`[Worker] Completed order ${orderId}`);
}

/**
 * Create and start the order worker
 */
export function startOrderWorker(): Worker {
    const worker = new Worker('order-execution', processOrder, {
        connection,
        concurrency: config.queue.concurrency, // Process 10 orders concurrently
        limiter: {
            max: config.queue.rateLimit, // 100 orders
            duration: 60000, // per minute
        },
    });

    worker.on('completed', (job) => {
        console.log(`[Worker] Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, err) => {
        console.error(`[Worker] Job ${job?.id} failed:`, err.message);

        if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
            console.error(`[Worker] Job ${job.id} exhausted all retry attempts`);
        }
    });

    worker.on('error', (err) => {
        console.error('[Worker] Worker error:', err);
    });

    console.log(`[Worker] Started with concurrency: ${config.queue.concurrency}, rate limit: ${config.queue.rateLimit}/min`);

    return worker;
}

/**
 * Gracefully shutdown the worker
 */
export async function stopOrderWorker(worker: Worker): Promise<void> {
    await worker.close();
    await connection.quit();
    console.log('[Worker] Stopped order worker');
}

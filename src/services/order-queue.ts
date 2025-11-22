import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';
import { CreateOrderDto } from '../types';

// Create Redis connection
const connection = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    maxRetriesPerRequest: null,
});

// Create order execution queue
export const orderQueue = new Queue('order-execution', {
    connection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 seconds
        },
        removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
            count: 50, // Keep last 50 failed jobs
        },
    },
});

// Queue events for monitoring
export const queueEvents = new QueueEvents('order-execution', { connection });

// Setup event listeners
queueEvents.on('completed', ({ jobId }) => {
    console.log(`[Queue] Job ${jobId} completed`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
    console.error(`[Queue] Job ${jobId} failed: ${failedReason}`);
});

queueEvents.on('progress', ({ jobId, data }) => {
    console.log(`[Queue] Job ${jobId} progress:`, data);
});

/**
 * Add an order to the execution queue
 */
export async function addOrderToQueue(
    orderId: string,
    orderData: CreateOrderDto
): Promise<void> {
    await orderQueue.add(
        'execute-order',
        {
            orderId,
            ...orderData,
        },
        {
            jobId: orderId, // Use orderId as jobId for easy tracking
        }
    );

    console.log(`[Queue] Added order ${orderId} to queue`);
}

/**
 * Get queue metrics
 */
export async function getQueueMetrics() {
    const [waiting, active, completed, failed] = await Promise.all([
        orderQueue.getWaitingCount(),
        orderQueue.getActiveCount(),
        orderQueue.getCompletedCount(),
        orderQueue.getFailedCount(),
    ]);

    return {
        waiting,
        active,
        completed,
        failed,
        total: waiting + active + completed + failed,
    };
}

/**
 * Gracefully close queue connections
 */
export async function closeQueue(): Promise<void> {
    await orderQueue.close();
    await queueEvents.close();
    await connection.quit();
    console.log('[Queue] Closed all connections');
}

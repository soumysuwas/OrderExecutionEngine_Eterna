import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { config } from './config';
import { orderRoutes } from './routes/orders';
import { startOrderWorker, stopOrderWorker } from './workers/order-worker';
import { closeQueue } from './services/order-queue';
import prisma from './db/prisma';
import { Worker } from 'bullmq';

// Create Fastify instance
const fastify = Fastify({
    logger: {
        level: config.nodeEnv === 'development' ? 'info' : 'warn',
    },
});

let worker: Worker | null = null;

/**
 * Start the server
 */
async function start() {
    try {
        // Register WebSocket plugin
        await fastify.register(websocket);

        // Register routes
        await fastify.register(orderRoutes);

        // Test database connection
        await prisma.$connect();
        console.log('[Database] Connected to PostgreSQL');

        // Start order worker
        worker = startOrderWorker();

        // Start server
        await fastify.listen({
            port: config.port,
            host: '0.0.0.0',
        });

        console.log(`
╔════════════════════════════════════════════════╗
║   Order Execution Engine Started!             ║
╠════════════════════════════════════════════════╣
║   Server:  http://localhost:${config.port}              ║
║   Health:  http://localhost:${config.port}/api/health   ║
║   Environment: ${config.nodeEnv}                    ║
╚════════════════════════════════════════════════╝
    `);
    } catch (error) {
        console.error('[Server] Failed to start:', error);
        process.exit(1);
    }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
    console.log('\n[Server] Shutting down gracefully...');

    try {
        // Close Fastify server
        await fastify.close();
        console.log('[Server] Fastify server closed');

        // Stop worker
        if (worker) {
            await stopOrderWorker(worker);
        }

        // Close queue
        await closeQueue();

        // Disconnect database
        await prisma.$disconnect();
        console.log('[Database] Disconnected from PostgreSQL');

        console.log('[Server] Shutdown complete');
        process.exit(0);
    } catch (error) {
        console.error('[Server] Error during shutdown:', error);
        process.exit(1);
    }
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('[Server] Uncaught exception:', error);
    shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled rejection at:', promise, 'reason:', reason);
    shutdown();
});

// Start the application
start();

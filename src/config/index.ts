import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    database: {
        url: process.env.DATABASE_URL || '',
    },

    redis: {
        // Support both REDIS_URL (Render) and individual vars (local)
        url: process.env.REDIS_URL,
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
    },

    queue: {
        concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '10', 10),
        rateLimit: parseInt(process.env.QUEUE_RATE_LIMIT || '100', 10),
    },

    mock: {
        enabled: process.env.MOCK_DEX_ENABLED === 'true',
        delayMin: parseInt(process.env.MOCK_DELAY_MIN || '2000', 10),
        delayMax: parseInt(process.env.MOCK_DELAY_MAX || '3000', 10),
    },
};

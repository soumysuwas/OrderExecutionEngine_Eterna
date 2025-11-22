import { FastifyInstance } from 'fastify';
import { CreateOrderDto } from '../types';
import orderExecutor from '../services/order-executor';
import websocketManager from '../services/websocket-manager';
import { addOrderToQueue } from '../services/order-queue';

interface OrderExecuteBody {
    tokenIn: string;
    tokenOut: string;
    amount: number;
}

export async function orderRoutes(fastify: FastifyInstance) {
    fastify.post<{ Body: OrderExecuteBody }>(
        '/api/orders/execute',
        {
            schema: {
                body: {
                    type: 'object',
                    required: ['tokenIn', 'tokenOut', 'amount'],
                    properties: {
                        tokenIn: { type: 'string' },
                        tokenOut: { type: 'string' },
                        amount: { type: 'number', minimum: 0 },
                    },
                },
            },
        },
        async (request, reply) => {
            const { tokenIn, tokenOut, amount } = request.body;

            if (amount <= 0) {
                return reply.code(400).send({ error: 'Amount must be greater than 0' });
            }

            try {
                const orderId = await orderExecutor.createOrder({ tokenIn, tokenOut, amount });
                await addOrderToQueue(orderId, { tokenIn, tokenOut, amount });

                return reply.code(201).send({
                    success: true,
                    orderId,
                    message: 'Order created successfully. Connect via WebSocket for status updates.',
                    websocketUrl: `/api/orders/${orderId}/ws`,
                });
            } catch (error: any) {
                console.error('[API] Error creating order:', error);
                return reply.code(500).send({
                    success: false,
                    error: 'Failed to create order',
                    message: error.message,
                });
            }
        }
    );

    fastify.get('/api/orders/:orderId/ws', { websocket: true }, (connection: any, request) => {
        const { orderId } = request.params as { orderId: string };
        console.log(`[WebSocket] Client connected for order ${orderId}`);

        websocketManager.registerConnection(orderId, connection);

        connection.socket.send(JSON.stringify({
            type: 'connected',
            orderId,
            message: 'WebSocket connection established',
            timestamp: Date.now(),
        }));

        connection.socket.on('message', (message: any) => {
            console.log(`[WebSocket] Received message for order ${orderId}:`, message.toString());
        });
    });

    fastify.get<{ Params: { orderId: string } }>('/api/orders/:orderId', async (request, reply) => {
        const { orderId } = request.params;

        try {
            const order = await orderExecutor.getOrderById(orderId);

            if (!order) {
                return reply.code(404).send({
                    success: false,
                    error: 'Order not found',
                });
            }

            return reply.send({
                success: true,
                order,
            });
        } catch (error: any) {
            console.error('[API] Error fetching order:', error);
            return reply.code(500).send({
                success: false,
                error: 'Failed to fetch order',
                message: error.message,
            });
        }
    });

    fastify.get<{ Querystring: { skip?: string; take?: string } }>('/api/orders', async (request, reply) => {
        const skip = parseInt(request.query.skip || '0', 10);
        const take = parseInt(request.query.take || '20', 10);

        try {
            const orders = await orderExecutor.getAllOrders(skip, take);

            return reply.send({
                success: true,
                orders,
                pagination: {
                    skip,
                    take,
                    count: orders.length,
                },
            });
        } catch (error: any) {
            console.error('[API] Error fetching orders:', error);
            return reply.code(500).send({
                success: false,
                error: 'Failed to fetch orders',
                message: error.message,
            });
        }
    });

    fastify.get('/api/health', async (request, reply) => {
        return reply.send({
            success: true,
            status: 'healthy',
            timestamp: Date.now(),
        });
    });
}

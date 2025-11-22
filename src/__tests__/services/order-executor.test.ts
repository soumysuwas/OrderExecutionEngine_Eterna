import { OrderExecutor } from '../../services/order-executor';
import prisma from '../../db/prisma';
import websocketManager from '../../services/websocket-manager';

// Mock dependencies
jest.mock('../../db/prisma', () => ({
    __esModule: true,
    default: {
        order: {
            create: jest.fn(),
            update: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
    },
}));

jest.mock('../../services/websocket-manager', () => ({
    __esModule: true,
    default: {
        sendUpdate: jest.fn(),
    },
}));

jest.mock('../../services/dex-router', () => ({
    __esModule: true,
    default: {
        compareAndRoute: jest.fn().mockResolvedValue({
            selectedDex: 'raydium',
            quote: {
                dex: 'raydium',
                price: 1.0,
                fee: 0.003,
                estimatedOutput: 99.7,
                timestamp: Date.now(),
            },
            quotes: [],
        }),
        executeSwap: jest.fn().mockResolvedValue({
            txHash: 'test-tx-hash-123',
            executedPrice: 1.0,
            outputAmount: 99.7,
            timestamp: Date.now(),
        }),
    },
}));

describe('OrderExecutor', () => {
    let orderExecutor: OrderExecutor;

    beforeEach(() => {
        orderExecutor = new OrderExecutor();
        jest.clearAllMocks();
    });

    describe('createOrder', () => {
        it('should create a new order in database', async () => {
            const mockCreate = prisma.order.create as jest.Mock;
            mockCreate.mockResolvedValue({
                id: 'test-order-id',
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amount: 100,
                status: 'pending',
            });

            const orderId = await orderExecutor.createOrder({
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amount: 100,
            });

            expect(orderId).toBeDefined();
            expect(typeof orderId).toBe('string');
            expect(mockCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        tokenIn: 'SOL',
                        tokenOut: 'USDC',
                        amount: 100,
                        status: 'pending',
                    }),
                })
            );
        });
    });

    describe('updateOrderStatus', () => {
        it('should update order status in database and send WebSocket update', async () => {
            const mockUpdate = prisma.order.update as jest.Mock;
            mockUpdate.mockResolvedValue({});

            await orderExecutor.updateOrderStatus('test-order-id', 'routing');

            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'test-order-id' },
                    data: expect.objectContaining({
                        status: 'routing',
                    }),
                })
            );

            expect(websocketManager.sendUpdate).toHaveBeenCalledWith(
                'test-order-id',
                expect.objectContaining({
                    orderId: 'test-order-id',
                    status: 'routing',
                })
            );
        });

        it('should store error message when status is failed', async () => {
            const mockUpdate = prisma.order.update as jest.Mock;
            mockUpdate.mockResolvedValue({});

            await orderExecutor.updateOrderStatus(
                'test-order-id',
                'failed',
                undefined,
                'Test error message'
            );

            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: 'failed',
                        error: 'Test error message',
                    }),
                })
            );
        });
    });

    describe('getOrderById', () => {
        it('should fetch order from database', async () => {
            const mockOrder = {
                id: 'test-order-id',
                tokenIn: 'SOL',
                tokenOut: 'USDC',
                amount: 100,
                status: 'confirmed',
            };

            const mockFindUnique = prisma.order.findUnique as jest.Mock;
            mockFindUnique.mockResolvedValue(mockOrder);

            const order = await orderExecutor.getOrderById('test-order-id');

            expect(order).toEqual(mockOrder);
            expect(mockFindUnique).toHaveBeenCalledWith({
                where: { id: 'test-order-id' },
            });
        });
    });

    describe('getAllOrders', () => {
        it('should fetch paginated orders with default values', async () => {
            const mockOrders = [
                { id: '1', status: 'confirmed' },
                { id: '2', status: 'pending' },
            ];

            const mockFindMany = prisma.order.findMany as jest.Mock;
            mockFindMany.mockResolvedValue(mockOrders);

            const orders = await orderExecutor.getAllOrders();

            expect(orders).toEqual(mockOrders);
            expect(mockFindMany).toHaveBeenCalledWith({
                skip: 0,
                take: 20,
                orderBy: { createdAt: 'desc' },
            });
        });

        it('should support custom pagination', async () => {
            const mockFindMany = prisma.order.findMany as jest.Mock;
            mockFindMany.mockResolvedValue([]);

            await orderExecutor.getAllOrders(10, 50);

            expect(mockFindMany).toHaveBeenCalledWith({
                skip: 10,
                take: 50,
                orderBy: { createdAt: 'desc' },
            });
        });
    });
});

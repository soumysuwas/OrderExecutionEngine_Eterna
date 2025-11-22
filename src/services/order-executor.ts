import { OrderStatus, CreateOrderDto, OrderUpdate } from '../types';
import prisma from '../db/prisma';
import dexRouter from './dex-router';
import websocketManager from './websocket-manager';
import { v4 as uuidv4 } from 'uuid';

export class OrderExecutor {
    /**
     * Create a new order in the database
     */
    async createOrder(orderData: CreateOrderDto): Promise<string> {
        const orderId = uuidv4();

        await prisma.order.create({
            data: {
                id: orderId,
                tokenIn: orderData.tokenIn,
                tokenOut: orderData.tokenOut,
                amount: orderData.amount,
                status: 'pending',
            },
        });

        console.log(`[Order] Created order ${orderId}: ${orderData.amount} ${orderData.tokenIn} -> ${orderData.tokenOut}`);

        return orderId;
    }

    /**
     * Update order status in database and send WebSocket update
     */
    async updateOrderStatus(
        orderId: string,
        status: OrderStatus,
        data?: any,
        error?: string
    ): Promise<void> {
        const updateData: any = {
            status,
            updatedAt: new Date(),
        };

        if (data) {
            updateData.metadata = data;
        }

        if (error) {
            updateData.error = error;
        }

        await prisma.order.update({
            where: { id: orderId },
            data: updateData,
        });

        // Send WebSocket update
        const update: OrderUpdate = {
            orderId,
            status,
            message: this.getStatusMessage(status),
            data,
            timestamp: Date.now(),
        };

        websocketManager.sendUpdate(orderId, update);

        console.log(`[Order] Updated order ${orderId} status to ${status}`);
    }

    /**
     * Execute an order through the complete lifecycle
     */
    async executeOrder(orderId: string, orderData: CreateOrderDto): Promise<void> {
        try {
            // Step 1: Pending
            await this.updateOrderStatus(orderId, 'pending');

            // Step 2: Routing - Get quotes from DEXs
            await this.updateOrderStatus(orderId, 'routing');

            const { selectedDex, quote, quotes } = await dexRouter.compareAndRoute(
                orderData.tokenIn,
                orderData.tokenOut,
                orderData.amount
            );

            // Step 3: Building - Prepare transaction
            await this.updateOrderStatus(orderId, 'building', {
                selectedDex,
                quotes,
            });

            // Update selected DEX in database
            await prisma.order.update({
                where: { id: orderId },
                data: { selectedDex },
            });

            // Step 4: Submitted - Execute swap
            await this.updateOrderStatus(orderId, 'submitted', {
                selectedDex,
                estimatedPrice: quote.price,
            });

            const swapResult = await dexRouter.executeSwap(
                selectedDex,
                orderData.tokenIn,
                orderData.tokenOut,
                orderData.amount,
                quote
            );

            // Step 5: Confirmed - Transaction successful
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: 'confirmed',
                    txHash: swapResult.txHash,
                    executedPrice: swapResult.executedPrice,
                    metadata: JSON.parse(JSON.stringify({
                        quotes,
                        selectedDex,
                        outputAmount: swapResult.outputAmount,
                        executionTime: Date.now(),
                    })),
                },
            });

            await this.updateOrderStatus(orderId, 'confirmed', {
                txHash: swapResult.txHash,
                executedPrice: swapResult.executedPrice,
                outputAmount: swapResult.outputAmount,
            });

            console.log(`[Order] Successfully executed order ${orderId}`);
        } catch (error: any) {
            console.error(`[Order] Failed to execute order ${orderId}:`, error);

            await this.updateOrderStatus(orderId, 'failed', undefined, error.message);

            throw error;
        }
    }

    /**
     * Get a human-readable status message
     */
    private getStatusMessage(status: OrderStatus): string {
        const messages: Record<OrderStatus, string> = {
            pending: 'Order received and queued',
            routing: 'Comparing DEX prices',
            building: 'Creating transaction',
            submitted: 'Transaction sent to network',
            confirmed: 'Transaction successful',
            failed: 'Order execution failed',
        };

        return messages[status];
    }

    /**
     * Get order by ID
     */
    async getOrderById(orderId: string) {
        return await prisma.order.findUnique({
            where: { id: orderId },
        });
    }

    /**
     * Get all orders with pagination
     */
    async getAllOrders(skip: number = 0, take: number = 20) {
        return await prisma.order.findMany({
            skip,
            take,
            orderBy: { createdAt: 'desc' },
        });
    }
}

export default new OrderExecutor();

export type OrderStatus =
    | 'pending'
    | 'routing'
    | 'building'
    | 'submitted'
    | 'confirmed'
    | 'failed';

export interface Order {
    id: string;
    tokenIn: string;
    tokenOut: string;
    amount: number;
    status: OrderStatus;
    selectedDex?: string;
    executedPrice?: number;
    txHash?: string;
    error?: string;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateOrderDto {
    tokenIn: string;
    tokenOut: string;
    amount: number;
}

export interface DexQuote {
    dex: 'raydium' | 'meteora';
    price: number;
    fee: number;
    estimatedOutput: number;
    timestamp: number;
}

export interface SwapResult {
    txHash: string;
    executedPrice: number;
    outputAmount: number;
    timestamp: number;
}

export interface OrderUpdate {
    orderId: string;
    status: OrderStatus;
    message: string;
    data?: any;
    timestamp: number;
}

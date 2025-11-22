import { OrderUpdate } from '../types';
import { WebSocket } from 'ws';

interface SocketStream {
    socket: WebSocket;
}

class WebSocketManager {
    private connections: Map<string, SocketStream> = new Map();

    registerConnection(orderId: string, socket: SocketStream): void {
        this.connections.set(orderId, socket);
        console.log(`[WebSocket] Registered connection for order ${orderId}`);

        socket.socket.on('close', () => {
            this.removeConnection(orderId);
        });

        socket.socket.on('error', (error: Error) => {
            console.error(`[WebSocket] Error for order ${orderId}:`, error);
            this.removeConnection(orderId);
        });
    }

    removeConnection(orderId: string): void {
        if (this.connections.has(orderId)) {
            this.connections.delete(orderId);
            console.log(`[WebSocket] Removed connection for order ${orderId}`);
        }
    }

    sendUpdate(orderId: string, update: OrderUpdate): void {
        const socket = this.connections.get(orderId);

        if (socket && socket.socket.readyState === socket.socket.OPEN) {
            try {
                socket.socket.send(JSON.stringify(update));
                console.log(`[WebSocket] Sent update to order ${orderId}: ${update.status}`);
            } catch (error) {
                console.error(`[WebSocket] Failed to send update to order ${orderId}:`, error);
            }
        } else {
            console.warn(`[WebSocket] No active connection for order ${orderId}`);
        }
    }

    broadcast(message: any): void {
        this.connections.forEach((socket, orderId) => {
            if (socket.socket.readyState === socket.socket.OPEN) {
                try {
                    socket.socket.send(JSON.stringify(message));
                } catch (error) {
                    console.error(`[WebSocket] Failed to broadcast to order ${orderId}:`, error);
                }
            }
        });
    }

    getConnectionCount(): number {
        return this.connections.size;
    }

    hasConnection(orderId: string): boolean {
        const socket = this.connections.get(orderId);
        return socket !== undefined && socket.socket.readyState === socket.socket.OPEN;
    }
}

export default new WebSocketManager();

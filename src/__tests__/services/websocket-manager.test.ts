import websocketManager from '../../services/websocket-manager';
import { OrderUpdate } from '../../types';

// Mock WebSocket
class MockWebSocket {
    readyState: number = 1; // OPEN
    OPEN: number = 1;

    send = jest.fn();
    on = jest.fn();
}

class MockSocketStream {
    socket: MockWebSocket;

    constructor() {
        this.socket = new MockWebSocket();
    }
}

describe('WebSocketManager', () => {
    beforeEach(() => {
        // Clear all connections before each test
        (websocketManager as any).connections.clear();
    });

    describe('registerConnection', () => {
        it('should register a new WebSocket connection', () => {
            const mockSocket = new MockSocketStream() as any;

            websocketManager.registerConnection('test-order-1', mockSocket);

            expect(websocketManager.hasConnection('test-order-1')).toBe(true);
            expect(websocketManager.getConnectionCount()).toBe(1);
        });

        it('should setup event listeners for close and error', () => {
            const mockSocket = new MockSocketStream() as any;

            websocketManager.registerConnection('test-order-1', mockSocket);

            expect(mockSocket.socket.on).toHaveBeenCalledWith('close', expect.any(Function));
            expect(mockSocket.socket.on).toHaveBeenCalledWith('error', expect.any(Function));
        });
    });

    describe('removeConnection', () => {
        it('should remove a WebSocket connection', () => {
            const mockSocket = new MockSocketStream() as any;

            websocketManager.registerConnection('test-order-1', mockSocket);
            expect(websocketManager.hasConnection('test-order-1')).toBe(true);

            websocketManager.removeConnection('test-order-1');
            expect(websocketManager.hasConnection('test-order-1')).toBe(false);
        });

        it('should not throw error when removing non-existent connection', () => {
            expect(() => {
                websocketManager.removeConnection('non-existent');
            }).not.toThrow();
        });
    });

    describe('sendUpdate', () => {
        it('should send update to connected client', () => {
            const mockSocket = new MockSocketStream() as any;
            websocketManager.registerConnection('test-order-1', mockSocket);

            const update: OrderUpdate = {
                orderId: 'test-order-1',
                status: 'routing',
                message: 'Comparing DEX prices',
                timestamp: Date.now(),
            };

            websocketManager.sendUpdate('test-order-1', update);

            expect(mockSocket.socket.send).toHaveBeenCalledWith(JSON.stringify(update));
        });

        it('should not throw error when sending to non-existent connection', () => {
            const update: OrderUpdate = {
                orderId: 'non-existent',
                status: 'routing',
                message: 'Test',
                timestamp: Date.now(),
            };

            expect(() => {
                websocketManager.sendUpdate('non-existent', update);
            }).not.toThrow();
        });
    });

    describe('hasConnection', () => {
        it('should return true for active connection', () => {
            const mockSocket = new MockSocketStream() as any;
            websocketManager.registerConnection('test-order-1', mockSocket);

            expect(websocketManager.hasConnection('test-order-1')).toBe(true);
        });

        it('should return false for non-existent connection', () => {
            expect(websocketManager.hasConnection('non-existent')).toBe(false);
        });
    });

    describe('getConnectionCount', () => {
        it('should return correct count of connections', () => {
            expect(websocketManager.getConnectionCount()).toBe(0);

            const mockSocket1 = new MockSocketStream() as any;
            const mockSocket2 = new MockSocketStream() as any;

            websocketManager.registerConnection('test-order-1', mockSocket1);
            expect(websocketManager.getConnectionCount()).toBe(1);

            websocketManager.registerConnection('test-order-2', mockSocket2);
            expect(websocketManager.getConnectionCount()).toBe(2);

            websocketManager.removeConnection('test-order-1');
            expect(websocketManager.getConnectionCount()).toBe(1);
        });
    });
});

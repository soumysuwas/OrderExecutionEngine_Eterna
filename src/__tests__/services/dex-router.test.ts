import { DexRouter } from '../../services/dex-router';

describe('DexRouter', () => {
    let dexRouter: DexRouter;

    beforeEach(() => {
        dexRouter = new DexRouter();
    });

    describe('getRaydiumQuote', () => {
        it('should return a valid Raydium quote', async () => {
            const quote = await dexRouter.getRaydiumQuote('SOL', 'USDC', 100);

            expect(quote).toHaveProperty('dex', 'raydium');
            expect(quote).toHaveProperty('price');
            expect(quote).toHaveProperty('fee', 0.003);
            expect(quote).toHaveProperty('estimatedOutput');
            expect(quote).toHaveProperty('timestamp');
            expect(quote.estimatedOutput).toBeGreaterThan(0);
        });

        it('should have price variance between 98% and 102%', async () => {
            const quote = await dexRouter.getRaydiumQuote('SOL', 'USDC', 100);
            expect(quote.price).toBeGreaterThanOrEqual(0.98);
            expect(quote.price).toBeLessThanOrEqual(1.02);
        });
    });

    describe('getMeteorQuote', () => {
        it('should return a valid Meteora quote', async () => {
            const quote = await dexRouter.getMeteorQuote('SOL', 'USDC', 100);

            expect(quote).toHaveProperty('dex', 'meteora');
            expect(quote).toHaveProperty('price');
            expect(quote).toHaveProperty('fee', 0.002);
            expect(quote).toHaveProperty('estimatedOutput');
            expect(quote).toHaveProperty('timestamp');
            expect(quote.estimatedOutput).toBeGreaterThan(0);
        });

        it('should have lower fee than Raydium', async () => {
            const meteoraQuote = await dexRouter.getMeteorQuote('SOL', 'USDC', 100);
            expect(meteoraQuote.fee).toBe(0.002);
            expect(meteoraQuote.fee).toBeLessThan(0.003); // Lower than Raydium's 0.003
        });
    });

    describe('compareAndRoute', () => {
        it('should fetch quotes from both DEXs and select the best', async () => {
            const result = await dexRouter.compareAndRoute('SOL', 'USDC', 100);

            expect(result).toHaveProperty('selectedDex');
            expect(result).toHaveProperty('quote');
            expect(result).toHaveProperty('quotes');
            expect(result.quotes).toHaveLength(2);
            expect(['raydium', 'meteora']).toContain(result.selectedDex);
        });

        it('should select DEX with higher estimated output', async () => {
            const result = await dexRouter.compareAndRoute('SOL', 'USDC', 100);

            const raydiumQuote = result.quotes.find(q => q.dex === 'raydium');
            const meteoraQuote = result.quotes.find(q => q.dex === 'meteora');

            expect(raydiumQuote).toBeDefined();
            expect(meteoraQuote).toBeDefined();

            const selectedQuote = result.selectedDex === 'raydium' ? raydiumQuote : meteoraQuote;
            const otherQuote = result.selectedDex === 'raydium' ? meteoraQuote : raydiumQuote;

            if (selectedQuote && otherQuote) {
                expect(selectedQuote.estimatedOutput).toBeGreaterThanOrEqual(otherQuote.estimatedOutput);
            }
        });
    });

    describe('executeSwap', () => {
        it('should execute swap and return transaction result', async () => {
            const quote = await dexRouter.getRaydiumQuote('SOL', 'USDC', 100);
            const result = await dexRouter.executeSwap('raydium', 'SOL', 'USDC', 100, quote);

            expect(result).toHaveProperty('txHash');
            expect(result).toHaveProperty('executedPrice');
            expect(result).toHaveProperty('outputAmount');
            expect(result).toHaveProperty('timestamp');
            expect(result.txHash).toHaveLength(88);
            expect(result.executedPrice).toBeGreaterThan(0);
            expect(result.outputAmount).toBeGreaterThan(0);
        });

        it('should complete execution within expected time range', async () => {
            const quote = await dexRouter.getRaydiumQuote('SOL', 'USDC', 100);
            const startTime = Date.now();

            await dexRouter.executeSwap('raydium', 'SOL', 'USDC', 100, quote);

            const executionTime = Date.now() - startTime;
            expect(executionTime).toBeGreaterThanOrEqual(2000); // Min 2 seconds
            expect(executionTime).toBeLessThanOrEqual(3500); // Max ~3 seconds + buffer
        }, 10000);
    });
});

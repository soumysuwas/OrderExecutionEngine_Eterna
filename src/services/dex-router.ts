import { DexQuote, SwapResult } from '../types';
import { sleep, generateMockTxHash, getRandomInRange } from '../utils/helpers';
import { config } from '../config';

export class DexRouter {
    private basePrice: number = 1.0; // Base price for calculations

    /**
     * Get a quote from Raydium DEX
     * Simulates network delay and price variance
     */
    async getRaydiumQuote(
        tokenIn: string,
        tokenOut: string,
        amount: number
    ): Promise<DexQuote> {
        // Simulate network delay (200ms)
        await sleep(200);

        // Raydium: 98-102% of base price, 0.3% fee
        const priceVariance = getRandomInRange(0.98, 1.02);
        const price = this.basePrice * priceVariance;
        const fee = 0.003;
        const estimatedOutput = amount * price * (1 - fee);

        console.log(`[Raydium] Quote: ${tokenIn} -> ${tokenOut}, Price: ${price.toFixed(6)}, Output: ${estimatedOutput.toFixed(6)}`);

        return {
            dex: 'raydium',
            price,
            fee,
            estimatedOutput,
            timestamp: Date.now(),
        };
    }

    /**
     * Get a quote from Meteora DEX
     * Simulates network delay and price variance
     */
    async getMeteorQuote(
        tokenIn: string,
        tokenOut: string,
        amount: number
    ): Promise<DexQuote> {
        // Simulate network delay (200ms)
        await sleep(200);

        // Meteora: 97-102% of base price, 0.2% fee (lower fee)
        const priceVariance = getRandomInRange(0.97, 1.02);
        const price = this.basePrice * priceVariance;
        const fee = 0.002;
        const estimatedOutput = amount * price * (1 - fee);

        console.log(`[Meteora] Quote: ${tokenIn} -> ${tokenOut}, Price: ${price.toFixed(6)}, Output: ${estimatedOutput.toFixed(6)}`);

        return {
            dex: 'meteora',
            price,
            fee,
            estimatedOutput,
            timestamp: Date.now(),
        };
    }

    /**
     * Compare quotes from both DEXs and select the best route
     */
    async compareAndRoute(
        tokenIn: string,
        tokenOut: string,
        amount: number
    ): Promise<{ selectedDex: string; quote: DexQuote; quotes: DexQuote[] }> {
        console.log(`[DEX Router] Fetching quotes for ${amount} ${tokenIn} -> ${tokenOut}...`);

        // Fetch quotes from both DEXs in parallel
        const [raydiumQuote, meteoraQuote] = await Promise.all([
            this.getRaydiumQuote(tokenIn, tokenOut, amount),
            this.getMeteorQuote(tokenIn, tokenOut, amount),
        ]);

        // Select the DEX with better output (higher estimated output)
        const selectedQuote = raydiumQuote.estimatedOutput > meteoraQuote.estimatedOutput
            ? raydiumQuote
            : meteoraQuote;

        const priceDiff = Math.abs(
            ((raydiumQuote.estimatedOutput - meteoraQuote.estimatedOutput) / meteoraQuote.estimatedOutput) * 100
        );

        console.log(`[DEX Router] Selected ${selectedQuote.dex.toUpperCase()} (${priceDiff.toFixed(2)}% better output)`);

        return {
            selectedDex: selectedQuote.dex,
            quote: selectedQuote,
            quotes: [raydiumQuote, meteoraQuote],
        };
    }

    /**
     * Execute swap on the selected DEX
     * Simulates transaction execution with realistic delay
     */
    async executeSwap(
        dex: string,
        tokenIn: string,
        tokenOut: string,
        amount: number,
        quote: DexQuote
    ): Promise<SwapResult> {
        console.log(`[${dex.toUpperCase()}] Executing swap: ${amount} ${tokenIn} -> ${tokenOut}...`);

        // Simulate execution delay (2-3 seconds)
        const executionDelay = getRandomInRange(
            config.mock.delayMin,
            config.mock.delayMax
        );
        await sleep(executionDelay);

        // Final executed price might vary slightly from quote (±0.5% slippage)
        const slippage = getRandomInRange(-0.005, 0.005);
        const executedPrice = quote.price * (1 + slippage);
        const outputAmount = amount * executedPrice * (1 - quote.fee);

        const txHash = generateMockTxHash();

        console.log(`[${dex.toUpperCase()}] Swap executed! TxHash: ${txHash.substring(0, 20)}...`);

        return {
            txHash,
            executedPrice,
            outputAmount,
            timestamp: Date.now(),
        };
    }
}

export default new DexRouter();

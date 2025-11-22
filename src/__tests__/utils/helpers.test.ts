import { sleep, generateMockTxHash, getRandomInRange, calculatePercentageDiff } from '../../utils/helpers';

describe('Utility Helpers', () => {
    describe('sleep', () => {
        it('should delay execution for specified milliseconds', async () => {
            const startTime = Date.now();
            await sleep(100);
            const endTime = Date.now();

            const elapsed = endTime - startTime;
            expect(elapsed).toBeGreaterThanOrEqual(100);
            expect(elapsed).toBeLessThan(150); // Allow some buffer
        });
    });

    describe('generateMockTxHash', () => {
        it('should generate a transaction hash of 88 characters', () => {
            const txHash = generateMockTxHash();
            expect(txHash).toHaveLength(88);
        });

        it('should generate unique transaction hashes', () => {
            const hash1 = generateMockTxHash();
            const hash2 = generateMockTxHash();
            const hash3 = generateMockTxHash();

            expect(hash1).not.toBe(hash2);
            expect(hash2).not.toBe(hash3);
            expect(hash1).not.toBe(hash3);
        });

        it('should only contain alphanumeric characters', () => {
            const txHash = generateMockTxHash();
            expect(txHash).toMatch(/^[A-Za-z0-9]+$/);
        });
    });

    describe('getRandomInRange', () => {
        it('should return a number within the specified range', () => {
            const min = 10;
            const max = 20;

            for (let i = 0; i < 100; i++) {
                const result = getRandomInRange(min, max);
                expect(result).toBeGreaterThanOrEqual(min);
                expect(result).toBeLessThanOrEqual(max);
            }
        });

        it('should return different values on subsequent calls', () => {
            const values = new Set();

            for (let i = 0; i < 50; i++) {
                values.add(getRandomInRange(0, 1000));
            }

            // Should have multiple unique values
            expect(values.size).toBeGreaterThan(40);
        });
    });

    describe('calculatePercentageDiff', () => {
        it('should calculate positive percentage difference correctly', () => {
            const result = calculatePercentageDiff(100, 110);
            expect(result).toBe(10);
        });

        it('should calculate negative percentage difference correctly', () => {
            const result = calculatePercentageDiff(100, 90);
            expect(result).toBe(-10);
        });

        it('should return 0 for identical values', () => {
            const result = calculatePercentageDiff(100, 100);
            expect(result).toBe(0);
        });

        it('should handle decimal values', () => {
            const result = calculatePercentageDiff(50, 55);
            expect(result).toBeCloseTo(10, 1);
        });
    });
});

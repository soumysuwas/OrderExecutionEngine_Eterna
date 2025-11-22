export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const generateMockTxHash = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let hash = '';
    for (let i = 0; i < 88; i++) {
        hash += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return hash;
};

export const getRandomInRange = (min: number, max: number): number => {
    return min + Math.random() * (max - min);
};

export const calculatePercentageDiff = (value1: number, value2: number): number => {
    return ((value2 - value1) / value1) * 100;
};

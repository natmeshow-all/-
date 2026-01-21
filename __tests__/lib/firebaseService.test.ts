import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase SDK
vi.mock('firebase/database', () => ({
    ref: vi.fn(),
    get: vi.fn(),
    push: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    query: vi.fn(),
    orderByChild: vi.fn(),
}));

vi.mock('firebase/storage', () => ({
    ref: vi.fn(),
    uploadBytes: vi.fn(),
    getDownloadURL: vi.fn(),
}));

vi.mock('@/app/lib/firebase', () => ({
    database: {},
    storage: {},
}));

// Import after mocks
import * as firebaseDatabase from 'firebase/database';

describe('firebaseService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getMachines', () => {
        it('should return empty array when no machines exist', async () => {
            const mockSnapshot = {
                exists: () => false,
            };
            vi.mocked(firebaseDatabase.get).mockResolvedValue(mockSnapshot as any);

            // Dynamic import to get fresh module with mocks
            const { getMachines } = await import('@/app/lib/firebaseService');
            const result = await getMachines();

            expect(result).toEqual([]);
        });

        it('should return machines when data exists', async () => {
            const mockData = {
                machine1: {
                    name: 'Test Machine',
                    Location: 'FZ',
                    status: 'active',
                    createdAt: '2024-01-01T00:00:00.000Z',
                    updatedAt: '2024-01-01T00:00:00.000Z',
                },
            };

            const mockSnapshot = {
                exists: () => true,
                forEach: (callback: (child: any) => void) => {
                    Object.entries(mockData).forEach(([key, value]) => {
                        callback({
                            key,
                            val: () => value,
                        });
                    });
                },
            };
            vi.mocked(firebaseDatabase.get).mockResolvedValue(mockSnapshot as any);

            const { getMachines } = await import('@/app/lib/firebaseService');
            const result = await getMachines();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Test Machine');
            expect(result[0].id).toBe('machine1');
        });
    });

    describe('getParts', () => {
        it('should return empty array when no parts exist', async () => {
            const mockSnapshot = {
                exists: () => false,
            };
            vi.mocked(firebaseDatabase.get).mockResolvedValue(mockSnapshot as any);

            const { getParts } = await import('@/app/lib/firebaseService');
            const result = await getParts();

            expect(result).toEqual([]);
        });

        it('should map legacy fields correctly', async () => {
            const mockData = {
                part1: {
                    partName: 'Motor',
                    machine: 'Test Machine', // Legacy field
                    image: 'http://example.com/image.jpg', // Legacy field
                    qty: 5, // Legacy field
                    createdAt: '2024-01-01T00:00:00.000Z',
                    updatedAt: '2024-01-01T00:00:00.000Z',
                },
            };

            const mockSnapshot = {
                exists: () => true,
                forEach: (callback: (child: any) => void) => {
                    Object.entries(mockData).forEach(([key, value]) => {
                        callback({
                            key,
                            val: () => value,
                        });
                    });
                },
            };
            vi.mocked(firebaseDatabase.get).mockResolvedValue(mockSnapshot as any);

            const { getParts } = await import('@/app/lib/firebaseService');
            const result = await getParts();

            expect(result).toHaveLength(1);
            expect(result[0].imageUrl).toBe('http://example.com/image.jpg');
            expect(result[0].quantity).toBe(5);
            expect(result[0].machineName).toBe('Test Machine');
        });
    });

    describe('getSpareParts', () => {
        it('should return empty array when no spare parts exist', async () => {
            const mockSnapshot = {
                exists: () => false,
            };
            vi.mocked(firebaseDatabase.get).mockResolvedValue(mockSnapshot as any);

            const { getSpareParts } = await import('@/app/lib/firebaseService');
            const result = await getSpareParts();

            expect(result).toEqual([]);
        });

        it('should sort spare parts by name', async () => {
            const mockData = {
                sp1: {
                    name: 'Zebra Part',
                    quantity: 10,
                    minStockThreshold: 5,
                    createdAt: '2024-01-01T00:00:00.000Z',
                    updatedAt: '2024-01-01T00:00:00.000Z',
                },
                sp2: {
                    name: 'Alpha Part',
                    quantity: 5,
                    minStockThreshold: 2,
                    createdAt: '2024-01-01T00:00:00.000Z',
                    updatedAt: '2024-01-01T00:00:00.000Z',
                },
            };

            const mockSnapshot = {
                exists: () => true,
                forEach: (callback: (child: any) => void) => {
                    Object.entries(mockData).forEach(([key, value]) => {
                        callback({
                            key,
                            val: () => value,
                        });
                    });
                },
            };
            vi.mocked(firebaseDatabase.get).mockResolvedValue(mockSnapshot as any);

            const { getSpareParts } = await import('@/app/lib/firebaseService');
            const result = await getSpareParts();

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Alpha Part');
            expect(result[1].name).toBe('Zebra Part');
        });
    });
});

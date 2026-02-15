import Airtable from 'airtable';
import { UserProfile, UsageStatistics, BusinessDetails } from '@/types/user';

// Check if Airtable credentials are configured
const isConfigured = !!(
    process.env.AIRTABLE_API_KEY &&
    process.env.AIRTABLE_BASE_ID &&
    process.env.AIRTABLE_TABLE_NAME
);

// Initialize Airtable client if configured
let base: Airtable.Base | null = null;
if (isConfigured) {
    Airtable.configure({
        apiKey: process.env.AIRTABLE_API_KEY,
    });
    base = Airtable.base(process.env.AIRTABLE_BASE_ID!);
}

// Mock data for development
const mockUsers: Map<string, UserProfile> = new Map();
const mockStats: Map<string, UsageStatistics> = new Map();

/**
 * Airtable Service
 * Provides CRUD operations for user data and statistics
 * Falls back to mock data when Airtable is not configured
 */
export const airtableService = {
    /**
     * Check if Airtable is configured
     */
    isConfigured: () => isConfigured,

    /**
     * Create a new user profile
     */
    async createUser(userId: string, email: string, businessDetails?: BusinessDetails): Promise<UserProfile> {
        if (!isConfigured) {
            // Mock mode
            const user: UserProfile = {
                id: userId,
                email,
                createdAt: new Date().toISOString(),
                businessDetails,
            };
            mockUsers.set(userId, user);

            // Initialize mock stats
            mockStats.set(userId, {
                userId,
                callsHandled: 0,
                appointmentsBooked: 0,
                messagesResponded: 0,
                averageResponseTime: 0,
                lastUpdated: new Date().toISOString(),
            });

            return user;
        }

        // Real Airtable implementation
        const record = await base!(process.env.AIRTABLE_TABLE_NAME!).create({
            userId,
            email,
            createdAt: new Date().toISOString(),
            businessDetails: businessDetails ? JSON.stringify(businessDetails) : undefined,
        });

        return {
            id: record.id,
            email: record.get('email') as string,
            createdAt: record.get('createdAt') as string,
            businessDetails: record.get('businessDetails')
                ? JSON.parse(record.get('businessDetails') as string)
                : undefined,
        };
    },

    /**
     * Get user profile by ID
     */
    async getUser(userId: string): Promise<UserProfile | null> {
        if (!isConfigured) {
            // Mock mode
            return mockUsers.get(userId) || null;
        }

        // Real Airtable implementation
        try {
            const records = await base!(process.env.AIRTABLE_TABLE_NAME!)
                .select({
                    filterByFormula: `{userId} = '${userId}'`,
                    maxRecords: 1,
                })
                .firstPage();

            if (records.length === 0) return null;

            const record = records[0];
            return {
                id: record.id,
                email: record.get('email') as string,
                createdAt: record.get('createdAt') as string,
                businessDetails: record.get('businessDetails')
                    ? JSON.parse(record.get('businessDetails') as string)
                    : undefined,
            };
        } catch (error) {
            console.error('Error fetching user from Airtable:', error);
            return null;
        }
    },

    /**
     * Update user profile
     */
    async updateUser(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
        if (!isConfigured) {
            // Mock mode
            const user = mockUsers.get(userId);
            if (!user) return null;

            const updatedUser = { ...user, ...updates };
            mockUsers.set(userId, updatedUser);
            return updatedUser;
        }

        // Real Airtable implementation
        try {
            const records = await base!(process.env.AIRTABLE_TABLE_NAME!)
                .select({
                    filterByFormula: `{userId} = '${userId}'`,
                    maxRecords: 1,
                })
                .firstPage();

            if (records.length === 0) return null;

            const record = await base!(process.env.AIRTABLE_TABLE_NAME!).update(records[0].id, {
                email: updates.email,
                businessDetails: updates.businessDetails
                    ? JSON.stringify(updates.businessDetails)
                    : undefined,
            });

            return {
                id: record.id,
                email: record.get('email') as string,
                createdAt: record.get('createdAt') as string,
                businessDetails: record.get('businessDetails')
                    ? JSON.parse(record.get('businessDetails') as string)
                    : undefined,
            };
        } catch (error) {
            console.error('Error updating user in Airtable:', error);
            return null;
        }
    },

    /**
     * Get usage statistics for a user
     */
    async getStats(userId: string): Promise<UsageStatistics | null> {
        if (!isConfigured) {
            // Mock mode - return sample data
            const existing = mockStats.get(userId);
            if (existing) return existing;

            // Generate mock stats for demo
            const mockData: UsageStatistics = {
                userId,
                callsHandled: Math.floor(Math.random() * 150) + 50,
                appointmentsBooked: Math.floor(Math.random() * 80) + 20,
                messagesResponded: Math.floor(Math.random() * 200) + 100,
                averageResponseTime: Math.floor(Math.random() * 5) + 1,
                lastUpdated: new Date().toISOString(),
                monthlyData: [
                    { month: 'Jan', calls: 45, appointments: 28, messages: 92 },
                    { month: 'Feb', calls: 52, appointments: 31, messages: 108 },
                    { month: 'Mar', calls: 48, appointments: 25, messages: 95 },
                ],
            };
            mockStats.set(userId, mockData);
            return mockData;
        }

        // Real Airtable implementation would query a stats table
        // This is a placeholder for future implementation
        return {
            userId,
            callsHandled: 0,
            appointmentsBooked: 0,
            messagesResponded: 0,
            averageResponseTime: 0,
            lastUpdated: new Date().toISOString(),
        };
    },

    /**
     * Update usage statistics
     */
    async updateStats(userId: string, stats: Partial<UsageStatistics>): Promise<UsageStatistics | null> {
        if (!isConfigured) {
            // Mock mode
            const existing = mockStats.get(userId);
            if (!existing) return null;

            const updated = { ...existing, ...stats, lastUpdated: new Date().toISOString() };
            mockStats.set(userId, updated);
            return updated;
        }

        // Real Airtable implementation
        // Placeholder for future implementation
        return null;
    },
};

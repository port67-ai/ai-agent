import Airtable from 'airtable';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME || 'Customers';

// Initialize Airtable only if keys are present
const base = (AIRTABLE_API_KEY && AIRTABLE_BASE_ID)
    ? new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID)
    : null;

export type CustomerData = {
    id: string; // Clerk User ID
    name: string;
    email: string;
    plan?: 'free' | 'pro';
    stripeCustomerId?: string;
};

export const db = {
    createCustomer: async (customer: CustomerData) => {
        if (!base) {
            console.log('📝 [MOCK DB] Saving customer:', customer);
            return { recordId: 'mock_record_id', ...customer };
        }

        try {
            const records = await base(AIRTABLE_TABLE_NAME).create([
                {
                    fields: {
                        "User ID": customer.id,
                        "Name": customer.name,
                        "Email": customer.email,
                        "Plan": customer.plan || 'free',
                        "Stripe Customer ID": customer.stripeCustomerId || ''
                    }
                }
            ]);
            return records[0];
        } catch (error) {
            console.error('❌ Error saving to Airtable:', error);
            throw error;
        }
    },

    getCustomer: async (userId: string) => {
        if (!base) {
            console.log('🔍 [MOCK DB] Fetching customer:', userId);
            return { id: userId, name: 'Mock User', email: 'mock@example.com', plan: 'free' };
        }

        try {
            const records = await base(AIRTABLE_TABLE_NAME).select({
                filterByFormula: `{User ID} = '${userId}'`,
                maxRecords: 1
            }).firstPage();

            if (records.length === 0) return null;
            return records[0];
        } catch (error) {
            console.error('❌ Error fetching from Airtable:', error);
            return null;
        }
    }
};

export interface UserProfile {
    id: string;
    email: string;
    createdAt: string;
    businessDetails?: BusinessDetails;
}

export interface BusinessDetails {
    businessName: string;
    businessType: 'Plumber' | 'Electrician' | 'Gardener' | 'Carpenter' | 'Other';
    phoneNumber: string;
    workingDays: string[];
    workingHours: {
        start: string;
        end: string;
    };
    serviceArea: string;
    assistantVoice?: string;
    additionalNotes?: string;
}

export interface UsageStatistics {
    userId: string;
    callsHandled: number;
    appointmentsBooked: number;
    messagesResponded: number;
    averageResponseTime: number; // in minutes
    lastUpdated: string;
    monthlyData?: MonthlyStats[];
}

export interface MonthlyStats {
    month: string;
    calls: number;
    appointments: number;
    messages: number;
}

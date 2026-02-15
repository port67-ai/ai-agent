export interface SignUpFormData {
    email: string;
    password: string;
}

export interface BusinessDetailsFormData {
    businessName: string;
    businessType: 'Plumber' | 'Electrician' | 'Gardener' | 'Carpenter' | 'Other' | '';
    phoneNumber: string;
    workingDays: string[];
    workingHours: {
        start: string;
        end: string;
    };
    businessLink: string;
    assistantVoice: string;
    additionalNotes?: string;
}

export interface CheckoutData {
    userId: string;
    email: string;
    businessDetails: BusinessDetailsFormData;
    planType: 'annual' | 'monthly';
    amount: number;
}

export interface PaymentResult {
    success: boolean;
    sessionId?: string;
    error?: string;
}

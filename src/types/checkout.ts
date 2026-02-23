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
    appointment1Name?: string;
    appointment1Duration?: number;
    appointment2Name?: string;
    appointment2Duration?: number;
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

export interface AiReviewData {
    business_name: string;
    business_type: string;
    business_address: string;
    areas_covered: string;
    service_1: string;
    service_2: string;
    service_3: string;
    service_4: string;
    service_5: string;
    service_6: string;
    open_monday: string;
    open_tuesday: string;
    open_wednesday: string;
    open_thursday: string;
    open_friday: string;
    open_saturday: string;
    open_sunday: string;
    out_of_hours: string;
    booking_whatsapp: string;
    booking_sms: string;
    booking_either: string;
    accreditation: string;
    experience: string;
}

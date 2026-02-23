'use client';

import { useUser } from '@/hooks/useUser';
import { useState, useEffect } from 'react';
import { UserProfile } from '@/types/user';
import { User, Building, Phone, MapPin, Clock, Edit } from 'lucide-react';

export function UserProfileComponent() {
    const { user } = useUser();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/users?userId=${user?.uid}`);
                if (response.ok) {
                    const data = await response.json();
                    setProfile(data);
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.uid) {
            fetchProfile();
        }
    }, [user?.uid]);

    if (loading) {
        return (
            <div className="card animate-pulse">
                <div className="h-8 bg-surface-dark rounded w-1/3 mb-4" />
                <div className="space-y-3">
                    <div className="h-4 bg-surface-dark rounded w-full" />
                    <div className="h-4 bg-surface-dark rounded w-2/3" />
                </div>
            </div>
        );
    }

    return (
        <div className="card bg-white">
            <div className="flex items-start justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">Your Profile</h2>
                <button className="btn btn-outline btn-sm">
                    <Edit className="w-4 h-4" />
                    Edit
                </button>
            </div>

            <div className="space-y-4">
                {/* Email */}
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm text-muted">Email</p>
                        <p className="font-semibold text-foreground">{user?.email}</p>
                    </div>
                </div>

                {profile?.businessDetails && (
                    <>
                        {/* Business Name */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                                <Building className="w-5 h-5 text-secondary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted">Business Name</p>
                                <p className="font-semibold text-foreground">{profile.businessDetails.businessName}</p>
                                <p className="text-sm text-muted">{profile.businessDetails.businessType}</p>
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                <Phone className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <p className="text-sm text-muted">Phone Number</p>
                                <p className="font-semibold text-foreground">{profile.businessDetails.phoneNumber}</p>
                            </div>
                        </div>

                        {/* Service Area */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted">Service Area</p>
                                <p className="font-semibold text-foreground">{profile.businessDetails.serviceArea}</p>
                            </div>
                        </div>

                        {/* Working Hours */}
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                <Clock className="w-5 h-5 text-purple-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted">Working Hours</p>
                                <p className="font-semibold text-foreground">
                                    {profile.businessDetails.workingHours.start} - {profile.businessDetails.workingHours.end}
                                </p>
                                <p className="text-sm text-muted mt-1">
                                    {profile.businessDetails.workingDays.join(', ')}
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

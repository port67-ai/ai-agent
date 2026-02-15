'use client';

import { useUser } from '@/hooks/useUser';
import { useState, useEffect } from 'react';
import { UsageStatistics } from '@/types/user';
import { Phone, Calendar, MessageCircle, TrendingUp } from 'lucide-react';

export function UsageStats() {
    const { user } = useUser();
    const [stats, setStats] = useState<UsageStatistics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`/api/stats?userId=${user?.id}`);
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user?.id) {
            fetchStats();
        }
    }, [user?.id]);

    if (loading) {
        return (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="card animate-pulse">
                        <div className="h-12 bg-surface-dark rounded w-12 mb-3" />
                        <div className="h-8 bg-surface-dark rounded w-16 mb-2" />
                        <div className="h-4 bg-surface-dark rounded w-24" />
                    </div>
                ))}
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="card bg-white text-center py-12">
                <p className="text-muted">No usage data available yet</p>
            </div>
        );
    }

    const statCards = [
        {
            icon: Phone,
            label: 'Calls Handled',
            value: stats.callsHandled,
            color: 'from-blue-500 to-blue-600',
            bgColor: 'bg-blue-50',
        },
        {
            icon: Calendar,
            label: 'Appointments Booked',
            value: stats.appointmentsBooked,
            color: 'from-green-500 to-green-600',
            bgColor: 'bg-green-50',
        },
        {
            icon: MessageCircle,
            label: 'Messages Responded',
            value: stats.messagesResponded,
            color: 'from-purple-500 to-purple-600',
            bgColor: 'bg-purple-50',
        },
        {
            icon: TrendingUp,
            label: 'Avg Response Time',
            value: `${stats.averageResponseTime}m`,
            color: 'from-orange-500 to-orange-600',
            bgColor: 'bg-orange-50',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Usage Statistics</h2>
                <p className="text-muted">Your business assistant performance overview</p>
            </div>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            className="card bg-white card-hover animate-fade-in"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 shadow-md`}>
                                <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-3xl font-bold text-foreground mb-1">
                                {stat.value}
                            </div>
                            <div className="text-sm text-muted">
                                {stat.label}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Monthly Breakdown */}
            {stats.monthlyData && stats.monthlyData.length > 0 && (
                <div className="card bg-white">
                    <h3 className="font-bold text-lg mb-4">Monthly Breakdown</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-muted">Month</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted">Calls</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted">Appointments</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-muted">Messages</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.monthlyData.map((month) => (
                                    <tr key={month.month} className="border-b border-border last:border-0">
                                        <td className="py-3 px-4 font-medium">{month.month}</td>
                                        <td className="py-3 px-4 text-right">{month.calls}</td>
                                        <td className="py-3 px-4 text-right">{month.appointments}</td>
                                        <td className="py-3 px-4 text-right">{month.messages}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Last Updated */}
            <p className="text-sm text-muted text-center">
                Last updated: {new Date(stats.lastUpdated).toLocaleString()}
            </p>
        </div>
    );
}

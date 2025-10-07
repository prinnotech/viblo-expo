// hooks/usePayments.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Payment } from '@/lib/db_interface';

interface BrandPayment extends Payment {
    campaign_title?: string;
}

export const usePayments = (brandId: string | undefined) => {
    const [payments, setPayments] = useState<BrandPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalSpent, setTotalSpent] = useState(0);

    const fetchPayments = useCallback(async (isRefresh = false) => {
        if (!brandId) return;

        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const { data, error } = await supabase
                .from('payments')
                .select(`*,campaign:campaigns(title)`)
                .eq('brand_id', brandId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const paymentsWithCampaign = (data || []).map(p => ({
                ...p,
                campaign_title: p.campaign?.title || 'Deleted Campaign',
            }));

            setPayments(paymentsWithCampaign);
            setTotalSpent(paymentsWithCampaign.reduce((sum, p) => sum + parseFloat(p.amount as any), 0));
        } catch (err: any) {
            console.error('Error fetching payments:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [brandId]);

    const refresh = useCallback(() => {
        fetchPayments(true);
    }, [fetchPayments]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    return {
        payments,
        loading,
        refreshing,
        totalSpent,
        refresh,
    };
};
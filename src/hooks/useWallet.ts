import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export const useWallet = (influencerId: string) => {
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [hasPayoutMethod, setHasPayoutMethod] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const fetchWalletData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {

            // Fetch the sum of all 'earned_amount' for the user
            const { data: earningsData, error: earningsError } = await supabase
                .from('content_submissions')
                .select('earned_amount')
                .eq('influencer_id', influencerId);

            if (earningsError) throw earningsError;

            const total = earningsData.reduce((sum, submission) => sum + (submission.earned_amount || 0), 0);
            setTotalEarnings(total);

            // Check if the user has at least one payout method configured
            const { data: payoutData, error: payoutError } = await supabase
                .from('payout_methods')
                .select('*')
                .eq('user_id', influencerId);

            if (payoutError) throw payoutError;

            setHasPayoutMethod((payoutData?.length || 0) > 0);

        } catch (err) {
            console.error('Error fetching wallet data:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchWalletData();
    }, [fetchWalletData]);

    // We can also add a realtime listener here if needed in the future

    return { totalEarnings, hasPayoutMethod, loading, error, refetch: fetchWalletData };
};

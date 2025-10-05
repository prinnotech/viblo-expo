import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ContentSubmission } from '@/lib/db_interface';
import { SubmissionStatus } from '@/lib/enum_types';

export const useSubmissions = (statusFilter: SubmissionStatus | 'all') => {
    const [submissions, setSubmissions] = useState<ContentSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    const fetchSubmissions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            let query = supabase
                .from('content_submissions')
                .select(`
                    *,
                    influencer_id ( * ),
                    campaign_id ( * )
                `)
                .eq('influencer_id', user.id);

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            const { data, error: fetchError } = await query.order('submitted_at', { ascending: false });

            if (fetchError) throw fetchError;
            setSubmissions(data || []);

        } catch (err) {
            console.error('Error fetching submissions:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    // Initial fetch and refetch when filter changes
    useEffect(() => {
        fetchSubmissions();
    }, [statusFilter]); // Only depend on statusFilter, not fetchSubmissions

    // Real-time subscription - separate effect without fetchSubmissions dependency
    useEffect(() => {
        const channel = supabase
            .channel('public:content_submissions')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'content_submissions' },
                () => {
                    // Call fetch directly without depending on the callback
                    fetchSubmissions();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [statusFilter]); // Only re-subscribe when filter changes

    return { submissions, loading, error, refetch: fetchSubmissions };
};
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Campaign } from '@/components/CampaignCard';
import { Profile } from '@/lib/db_interface';

const PAGE_SIZE = 10; // Number of items to fetch per page

export const useCampaigns = (profile: Profile | null) => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false); // State for pull-to-refresh
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedNiches, setSelectedNiches] = useState<string[]>(profile?.niches || []);
    const [sort, setSort] = useState<'created_at' | 'rate_per_view'>('created_at');

    const isInitialMount = useRef(true);

    const fetchCampaigns = useCallback(async (currentPage: number, isRefresh = false) => {
        if (!profile) return;

        // Set the correct loading state
        if (isRefresh) {
            setRefreshing(true);
        } else if (currentPage === 0) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }

        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query;

        // --- User Type Specific Logic ---
        if (profile.user_type === 'brand') {
            query = supabase
                .from('campaigns')
                .select('*')
                .eq('brand_id', profile.id)
                .order(sort, { ascending: false })
                .range(from, to);
        } else { // Influencer
            query = supabase.rpc('search_campaigns_for_influencer', {
                p_search_term: searchTerm,
                p_target_niches: selectedNiches.length > 0 ? selectedNiches : null,
                p_user_location: profile.location || null,
            })
                .order(sort, { ascending: false })
                .range(from, to);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching campaigns:', error.message);
            setHasMore(false);
        } else {
            const newCampaigns = data || [];
            if (isRefresh) {
                setCampaigns(newCampaigns);
            } else {
                // Prevent adding duplicates during fast scrolling
                setCampaigns(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const filteredNew = newCampaigns.filter(c => !existingIds.has(c.id));
                    return [...prev, ...filteredNew];
                });
            }

            if (newCampaigns.length < PAGE_SIZE) {
                setHasMore(false);
            }
            setPage(currentPage + 1);
        }

        // Reset all loading states
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
    }, [profile, searchTerm, selectedNiches, sort]);

    const refresh = useCallback(() => {
        setPage(0);
        setHasMore(true);
        fetchCampaigns(0, true);
    }, [fetchCampaigns]);

    const loadMore = useCallback(() => {
        if (loading || loadingMore || !hasMore) return;
        fetchCampaigns(page);
    }, [loading, loadingMore, hasMore, page, fetchCampaigns]);

    // Effect for initial load
    useEffect(() => {
        if (profile) {
            refresh();
        }
    }, [profile]); // Only depends on profile

    // Effect for filter changes with debounce
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        const handler = setTimeout(() => {
            refresh();
        }, 500); // 500ms debounce

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm, selectedNiches, sort]);


    return {
        campaigns,
        loading,
        loadingMore,
        refreshing, // Return the new refreshing state
        hasMore,
        loadMore,
        refresh,
        searchTerm,
        setSearchTerm,
        selectedNiches,
        setSelectedNiches,
        sort,
        setSort,
    };
};


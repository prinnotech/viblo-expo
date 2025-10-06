// useInfluencers.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Influencer } from '@/lib/enum_types';
import { Profile } from '@/lib/db_interface';

const PAGE_SIZE = 10;

export const useCreators = (profile: Profile | null) => {
    const [influencers, setInfluencers] = useState<Influencer[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
    const [sort, setSort] = useState<'total_followers' | 'created_at'>('total_followers');

    const isInitialMount = useRef(true);

    const fetchInfluencers = useCallback(async (currentPage: number, isRefresh = false) => {
        if (!profile || profile.user_type !== 'brand') return;

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

        const { data, error } = await supabase
            .rpc('search_influencers_for_brand', {
                p_search_term: searchTerm,
                p_target_niches: selectedNiches.length > 0 ? selectedNiches : null,
            })
            .order(sort, { ascending: false })
            .range(from, to);

        if (error) {
            console.error('Error fetching influencers:', error.message);
            setHasMore(false);
        } else {
            const newInfluencers = data || [];
            if (isRefresh) {
                setInfluencers(newInfluencers);
            } else {
                // Prevent adding duplicates during fast scrolling
                setInfluencers(prev => {
                    const existingIds = new Set(prev.map(i => i.id));
                    const filteredNew = newInfluencers.filter(i => !existingIds.has(i.id));
                    return [...prev, ...filteredNew];
                });
            }

            if (newInfluencers.length < PAGE_SIZE) {
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
        fetchInfluencers(0, true);
    }, [fetchInfluencers]);

    const loadMore = useCallback(() => {
        if (loading || loadingMore || !hasMore) return;
        fetchInfluencers(page);
    }, [loading, loadingMore, hasMore, page, fetchInfluencers]);

    // Effect for initial load
    useEffect(() => {
        if (profile && profile.user_type === 'brand') {
            refresh();
        }
    }, [profile]);

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
        influencers,
        loading,
        loadingMore,
        refreshing,
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
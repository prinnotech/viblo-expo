// lib/enum_types.ts

// This file contains TypeScript types that correspond to the
// enumerated types (enums) in your Supabase database schema.
// Keeping them here ensures consistency and type safety across the app.

export type UserType = 'brand' | 'influencer';

export type SocialPlatform =
    | 'tiktok'
    | 'instagram'
    | 'youtube'
    | 'facebook'
    | 'snapchat'
    | 'twitter_x';

export type PayoutMethodType =
    | 'paypal'
    | 'wise'
    | 'bank_transfer'
    | 'revolut';

export type CampaignStatus =
    | 'draft'
    | 'active'
    | 'paused'
    | 'completed'
    | 'archived';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed';

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type SubmissionStatus =
    | 'pending_review'
    | 'needs_revision'
    | 'approved'
    | 'posted_live'
    | 'completed';

export type NotificationType =
    | 'new_message'
    | 'submission_received'
    | 'submission_approved'
    | 'submission_revision_needed'
    | 'new_campaign_match'
    | 'payout_completed';

export interface SocialLink {
    id: string;
    platform: SocialPlatform;
    url: string;
    handle: string | null;
    follower_count: number | null;
    total_views_count: number | null;
    total_likes_count: number | null;
    total_comments_count: number | null;
}


export interface Influencer {
    id: string;
    created_at: string;
    username: string;
    user_type: 'influencer';
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    website_url: string | null;
    is_verified: boolean;
    company_name: string | null;
    industry: string | null;
    location: string | null;
    niches: string[] | null;
    updated_at: string | null;
    social_links: SocialLink[];
    total_followers: number;
    total_views: number;
    total_likes: number;
}


export type CampaignType = 'service' | 'physical_product' | 'app' | 'local_business' | 'event' | 'content' | 'brand_awareness';

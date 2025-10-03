// lib/db_interface.ts

// This file contains TypeScript interfaces that correspond to your
// database tables. This helps in maintaining type safety when you fetch,
// insert, or update data from Supabase.

import {
    CampaignStatus,
    NotificationType,
    PaymentStatus,
    PayoutMethodType,
    PayoutStatus,
    SocialPlatform,
    SubmissionStatus,
    UserType
} from "./enum_types";

// Note: For fields of type `jsonb`, `any` or `unknown` are often used as placeholders.
// For better type safety, you can define specific interfaces for the expected JSON structure.
// For example:
// export interface GenderSplit { male: number; female: number; other: number; }
// and then use `gender_split: GenderSplit | null;`

// --- Main Tables ---

export interface Profile {
    id: string; // uuid
    created_at: string; // timestamp with time zone
    username: string;
    user_type: UserType;
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
    push_token: string | null;
    updated_at: string | null; // timestamp with time zone
}

export interface Campaign {
    id: string; // uuid
    brand_id: string; // uuid
    title: string;
    description: string | null;
    content_requirements: string | null;
    status: CampaignStatus;
    total_budget: number; // numeric
    rate_per_view: number; // numeric
    target_niches: string[] | null;
    target_audience_age: string | null;
    target_audience_locations: string[] | null;
    target_platforms: string[] | null;
    start_date: string | null; // timestamp with time zone
    end_date: string | null; // timestamp with time zone
    created_at: string | null; // timestamp with time zone
    updated_at: string | null; // timestamp with time zone
}

export interface ContentSubmission {
    id: string; // uuid
    influencer_id: string; // uuid
    campaign_id: string; // uuid
    status: SubmissionStatus;
    review_video_url: string;
    brand_feedback: string | null;
    public_post_url: string | null;
    view_count: number | null; // numeric
    like_count: number | null; // numeric
    comment_count: number | null; // numeric
    earned_amount: number | null; // numeric(10, 2)
    submitted_at: string | null; // timestamp with time zone
    approved_at: string | null; // timestamp with time zone
    posted_at: string | null; // timestamp with time zone
    video_summary: string | null;
    match_percentage: number | null;
    message: string | null;
    rating: number | null;
    justify: string | null;
}

export interface SocialLink {
    id: string; // uuid
    user_id: string; // uuid
    platform: SocialPlatform;
    url: string;
    handle: string | null;
    follower_count: number | null; // numeric
    total_views_count: number | null; // numeric
    total_likes_count: number | null; // numeric
    total_comments_count: number | null; // numeric
    created_at: string | null; // timestamp with time zone
    updated_at: string | null; // timestamp with time zone
}

// --- Messaging and Communication ---

export interface Conversation {
    id: string; // uuid
    created_at: string | null; // timestamp with time zone
}

export interface ConversationParticipant {
    id: string; // uuid
    conversation_id: string; // uuid
    user_id: string; // uuid
    joined_at: string | null; // timestamp with time zone
    created_at: string | null; // timestamp with time zone
}

export interface Message {
    id: string; // uuid
    conversation_id: string; // uuid
    sender_id: string; // uuid
    content: string;
    is_read: boolean | null;
    created_at: string | null; // timestamp with time zone
}

export interface CampaignComment {
    id: string; // uuid
    campaign_id: string; // uuid
    user_id: string; // uuid
    parent_comment_id: string | null; // uuid
    content: string;
    created_at: string | null; // timestamp with time zone
    // Example for JOIN query
    profiles?: Profile;
}

// --- Payments and Payouts ---

export interface Payment {
    id: string; // uuid
    brand_id: string; // uuid
    campaign_id: string | null; // uuid
    amount: number; // numeric
    currency: string;
    status: PaymentStatus;
    processor_payment_id: string;
    created_at: string | null; // timestamp with time zone
}

export interface PayoutMethod {
    id: string; // uuid
    user_id: string; // uuid
    method_type: PayoutMethodType;
    details: any | null; // jsonb - consider creating a specific interface
    is_primary: boolean;
    created_at: string | null; // timestamp with time zone
    updated_at: string | null; // timestamp with time zone
}

export interface Payout {
    id: string; // uuid
    influencer_id: string; // uuid
    payout_method_id: string; // uuid
    amount: number; // numeric
    currency: string;
    status: PayoutStatus;
    processor_payout_id: string | null;
    initiated_at: string | null; // timestamp with time zone
    completed_at: string | null; // timestamp with time zone
    created_at: string | null; // timestamp with time zone
}

// --- Analytics and Notifications ---

export interface InfluencerAnalytics {
    id: string; // uuid
    user_id: string; // uuid
    platform: SocialPlatform;
    age_range: string | null;
    gender_split: any | null; // jsonb - consider creating a specific interface
    top_locations: string[] | null;
    last_updated: string | null; // timestamp with time zone
    created_at: string | null; // timestamp with time zone
}

export interface Notification {
    id: string; // uuid
    recipient_id: string; // uuid
    sender_id: string | null; // uuid
    type: NotificationType;
    metadata: any | null; // jsonb - consider creating a specific interface
    is_read: boolean | null;
    created_at: string | null; // timestamp with time zone
}

// --- Miscellaneous ---

export interface Contact {
    id: string; // uuid
    created_at: string; // timestamp with time zone
    email: string | null;
    subject: string | null;
    message: string | null;
    form: string | null;
}


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

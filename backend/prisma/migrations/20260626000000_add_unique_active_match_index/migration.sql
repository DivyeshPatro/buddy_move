-- Prevent duplicate active matches for the same guest subscription.
-- A guest can only have one active match per subscription at any time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_match_guest_sub
ON matches ("guestSubscriptionId") WHERE status = 'ACTIVE';

-- Prevent the same host subscription from being paired to multiple guests
-- simultaneously (a bike seats one pillion).
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_match_host_sub
ON matches ("hostSubscriptionId") WHERE status = 'ACTIVE';

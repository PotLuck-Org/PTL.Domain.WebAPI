-- Migration script to add event_host_name column to community_events table
-- This script is idempotent and can be run multiple times safely

-- Add event_host_name column to community_events table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'community_events' 
        AND column_name = 'event_host_name'
    ) THEN
        ALTER TABLE community_events ADD COLUMN event_host_name VARCHAR(300);
        RAISE NOTICE 'Added event_host_name column to community_events table';
    ELSE
        RAISE NOTICE 'event_host_name column already exists in community_events table';
    END IF;
END $$;


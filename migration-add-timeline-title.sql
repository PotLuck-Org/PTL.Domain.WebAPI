-- Migration script to add title column to timeline_posts table
-- This script is idempotent and can be run multiple times safely

-- Add title column to timeline_posts table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'timeline_posts' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE timeline_posts ADD COLUMN title VARCHAR(500);
        RAISE NOTICE 'Added title column to timeline_posts table';
    ELSE
        RAISE NOTICE 'title column already exists in timeline_posts table';
    END IF;
END $$;


-- Migration script to add gender column to user_profiles table
-- This script is idempotent and can be run multiple times safely

-- Add gender column to user_profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'gender'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN gender VARCHAR(20);
        RAISE NOTICE 'Added gender column to user_profiles table';
    ELSE
        RAISE NOTICE 'gender column already exists in user_profiles table';
    END IF;
END $$;


-- Migration script to add date_of_birth column to user_profiles table
-- This script is idempotent and can be run multiple times safely

-- Add date_of_birth column to user_profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'date_of_birth'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN date_of_birth DATE;
        RAISE NOTICE 'Added date_of_birth column to user_profiles table';
    ELSE
        RAISE NOTICE 'date_of_birth column already exists in user_profiles table';
    END IF;
END $$;


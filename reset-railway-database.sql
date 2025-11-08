-- =====================================================
-- COMPLETE DATABASE RESET SCRIPT FOR RAILWAY
-- =====================================================
-- This script will DROP ALL existing tables and recreate them
-- Run this in Railway PostgreSQL Query tab

-- Step 1: Drop all tables (respecting foreign keys)
DROP TABLE IF EXISTS poll_votes CASCADE;
DROP TABLE IF EXISTS poll_options CASCADE;
DROP TABLE IF EXISTS polls CASCADE;
DROP TABLE IF EXISTS timeline_posts CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS community_events CASCADE;
DROP TABLE IF EXISTS user_addresses CASCADE;
DROP TABLE IF EXISTS user_socials CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;

-- Step 2: Drop types
DROP TYPE IF EXISTS user_role CASCADE;

-- Step 3: Now create everything fresh

-- Enable UUID extension (still needed for other tables)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('Admin', 'Member', 'President', 'Secretary');

-- Create sequence for user IDs
CREATE SEQUENCE IF NOT EXISTS user_id_seq START WITH 1;

-- Create sequence for event IDs
CREATE SEQUENCE IF NOT EXISTS event_id_seq START WITH 1;

-- Create sequence for blog IDs
CREATE SEQUENCE IF NOT EXISTS blog_id_seq START WITH 1;

-- Create sequence for timeline IDs
CREATE SEQUENCE IF NOT EXISTS timeline_id_seq START WITH 1;

-- Create sequence for poll IDs
CREATE SEQUENCE IF NOT EXISTS poll_id_seq START WITH 1;

-- Create function to generate user ID
CREATE OR REPLACE FUNCTION generate_user_id()
RETURNS TRIGGER AS $$
DECLARE
    next_id INTEGER;
    user_id VARCHAR(10);
BEGIN
    -- Get next sequence value
    next_id := NEXTVAL('user_id_seq');
    -- Format as USR001, USR002, etc.
    user_id := 'USR' || LPAD(next_id::TEXT, 3, '0');
    
    -- Assign to NEW.id
    NEW.id := user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate event ID
CREATE OR REPLACE FUNCTION generate_event_id()
RETURNS TRIGGER AS $$
DECLARE
    next_id INTEGER;
    event_id VARCHAR(10);
BEGIN
    -- Get next sequence value
    next_id := NEXTVAL('event_id_seq');
    -- Format as E01, E02, etc.
    event_id := 'E' || LPAD(next_id::TEXT, 2, '0');
    
    -- Assign to NEW.id
    NEW.id := event_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate blog ID
CREATE OR REPLACE FUNCTION generate_blog_id()
RETURNS TRIGGER AS $$
DECLARE
    next_id INTEGER;
    blog_id VARCHAR(10);
BEGIN
    -- Get next sequence value
    next_id := NEXTVAL('blog_id_seq');
    -- Format as BLG01, BLG02, etc.
    blog_id := 'BLG' || LPAD(next_id::TEXT, 2, '0');
    
    -- Assign to NEW.id
    NEW.id := blog_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate timeline ID
CREATE OR REPLACE FUNCTION generate_timeline_id()
RETURNS TRIGGER AS $$
DECLARE
    next_id INTEGER;
    timeline_id VARCHAR(10);
BEGIN
    -- Get next sequence value
    next_id := NEXTVAL('timeline_id_seq');
    -- Format as TML01, TML02, etc.
    timeline_id := 'TML' || LPAD(next_id::TEXT, 2, '0');
    
    -- Assign to NEW.id
    NEW.id := timeline_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate poll ID
CREATE OR REPLACE FUNCTION generate_poll_id()
RETURNS TRIGGER AS $$
DECLARE
    next_id INTEGER;
    poll_id VARCHAR(10);
BEGIN
    -- Get next sequence value
    next_id := NEXTVAL('poll_id_seq');
    -- Format as POL01, POL02, etc.
    poll_id := 'POL' || LPAD(next_id::TEXT, 2, '0');
    
    -- Assign to NEW.id
    NEW.id := poll_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users table (with correct columns)
CREATE TABLE users (
    id VARCHAR(10) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    role user_role DEFAULT 'Member',
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to generate user ID
CREATE TRIGGER generate_user_id_trigger
    BEFORE INSERT ON users
    FOR EACH ROW
    WHEN (NEW.id IS NULL)
    EXECUTE FUNCTION generate_user_id();

-- User Profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(10) REFERENCES users(id) ON DELETE CASCADE,
    firstname VARCHAR(100),
    lastname VARCHAR(100),
    middlename VARCHAR(100),
    about TEXT,
    occupation VARCHAR(200),
    phone_number VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- User Socials table
CREATE TABLE user_socials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(10) REFERENCES users(id) ON DELETE CASCADE,
    facebook_url VARCHAR(500),
    github_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    twitter_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- User Addresses table
CREATE TABLE user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(10) REFERENCES users(id) ON DELETE CASCADE,
    street_number VARCHAR(50),
    street_address VARCHAR(500),
    post_code VARCHAR(50),
    county VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- User Connections table
CREATE TABLE user_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(10) REFERENCES users(id) ON DELETE CASCADE,
    connected_user_id VARCHAR(10) REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, connected_user_id)
);

CREATE INDEX idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX idx_user_connections_connected_user_id ON user_connections(connected_user_id);
CREATE INDEX idx_user_connections_status ON user_connections(status);

-- Community Events table
CREATE TABLE community_events (
    id VARCHAR(10) PRIMARY KEY,
    event_name VARCHAR(300) NOT NULL,
    event_address VARCHAR(500),
    event_time TIME,
    event_date DATE,
    event_description TEXT,
    event_host VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to generate event ID
CREATE TRIGGER generate_event_id_trigger
    BEFORE INSERT ON community_events
    FOR EACH ROW
    WHEN (NEW.id IS NULL)
    EXECUTE FUNCTION generate_event_id();

-- Event Attendees table
CREATE TABLE event_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id VARCHAR(10) REFERENCES community_events(id) ON DELETE CASCADE,
    user_id VARCHAR(10) REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'registered' CHECK (status IN ('registered', 'checked_in', 'cancelled')),
    checked_in_at TIMESTAMP,
    checked_in_by VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX idx_event_attendees_status ON event_attendees(status);

-- Blog Posts table
CREATE TABLE blog_posts (
    id VARCHAR(10) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    blog_content TEXT NOT NULL,
    is_available BOOLEAN DEFAULT FALSE,
    author_id VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to generate blog ID
CREATE TRIGGER generate_blog_id_trigger
    BEFORE INSERT ON blog_posts
    FOR EACH ROW
    WHEN (NEW.id IS NULL)
    EXECUTE FUNCTION generate_blog_id();

-- Timeline Posts table
CREATE TABLE timeline_posts (
    id VARCHAR(10) PRIMARY KEY,
    content TEXT NOT NULL,
    image_url VARCHAR(500),
    attachment_url VARCHAR(500),
    attachment_name VARCHAR(300),
    author_id VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to generate timeline ID
CREATE TRIGGER generate_timeline_id_trigger
    BEFORE INSERT ON timeline_posts
    FOR EACH ROW
    WHEN (NEW.id IS NULL)
    EXECUTE FUNCTION generate_timeline_id();

-- Polls table
CREATE TABLE polls (
    id VARCHAR(10) PRIMARY KEY,
    question TEXT NOT NULL,
    description TEXT,
    created_by VARCHAR(10) REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Poll Options table
CREATE TABLE poll_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id VARCHAR(10) REFERENCES polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Poll Votes table
CREATE TABLE poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id VARCHAR(10) REFERENCES polls(id) ON DELETE CASCADE,
    option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id VARCHAR(10) REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, user_id) -- Prevent multiple votes per user per poll
);

-- Trigger to generate poll ID
CREATE TRIGGER generate_poll_id_trigger
    BEFORE INSERT ON polls
    FOR EACH ROW
    WHEN (NEW.id IS NULL)
    EXECUTE FUNCTION generate_poll_id();

-- Role Permissions table
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role user_role NOT NULL,
    permissions TEXT[] NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role)
);

-- Insert default role permissions
INSERT INTO role_permissions (role, permissions) VALUES
    ('Admin', ARRAY['*']::TEXT[]),
    ('President', ARRAY['view_private_profiles', 'view_events', 'view_blogs']::TEXT[]),
    ('Secretary', ARRAY['create_events', 'update_events', 'delete_events', 'create_blogs', 'update_blogs', 'delete_blogs', 'view_events', 'view_blogs']::TEXT[]),
    ('Member', ARRAY['view_public_profiles', 'view_events', 'view_blogs', 'create_own_blog']::TEXT[]);

-- Create trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for auto-update timestamps
CREATE TRIGGER update_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_socials_updated BEFORE UPDATE ON user_socials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_addresses_updated BEFORE UPDATE ON user_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_community_events_updated BEFORE UPDATE ON community_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_connections_updated BEFORE UPDATE ON user_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_event_attendees_updated BEFORE UPDATE ON event_attendees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timeline_posts_updated BEFORE UPDATE ON timeline_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_polls_updated BEFORE UPDATE ON polls FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_role_permissions_updated BEFORE UPDATE ON role_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_community_events_event_host ON community_events(event_host);
CREATE INDEX idx_blog_posts_author_id ON blog_posts(author_id);
CREATE INDEX idx_blog_posts_is_available ON blog_posts(is_available);
CREATE INDEX idx_timeline_posts_author_id ON timeline_posts(author_id);
CREATE INDEX idx_polls_created_by ON polls(created_by);
CREATE INDEX idx_polls_is_active ON polls(is_active);
CREATE INDEX idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_option_id ON poll_votes(option_id);
CREATE INDEX idx_poll_votes_user_id ON poll_votes(user_id);

-- Verify tables were created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public';
    
    RAISE NOTICE 'Database initialized successfully!';
    RAISE NOTICE 'Created % tables', table_count;
END $$;


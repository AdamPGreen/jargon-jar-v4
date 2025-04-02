-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create workspaces table first (no dependencies)
CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slack_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    token TEXT NOT NULL,
    bot_token TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create users table (depends on workspaces)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slack_id TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create jargon_terms table (depends on users and workspaces)
CREATE TABLE jargon_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term TEXT NOT NULL,
    description TEXT,
    default_cost DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    created_by UUID REFERENCES users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create channels table (depends on workspaces)
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slack_id TEXT NOT NULL,
    name TEXT NOT NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    is_monitoring BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(slack_id, workspace_id)
);

-- Create charges table (depends on users, jargon_terms, and workspaces)
CREATE TABLE charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    charged_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    charging_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    jargon_term_id UUID NOT NULL REFERENCES jargon_terms(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    message_text TEXT NOT NULL,
    message_ts TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    is_automatic BOOLEAN NOT NULL DEFAULT false,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_users_workspace_id ON users(workspace_id);
CREATE INDEX idx_jargon_terms_workspace_id ON jargon_terms(workspace_id);
CREATE INDEX idx_channels_workspace_id ON channels(workspace_id);
CREATE INDEX idx_charges_workspace_id ON charges(workspace_id);
CREATE INDEX idx_charges_charged_user_id ON charges(charged_user_id);
CREATE INDEX idx_charges_charging_user_id ON charges(charging_user_id);
CREATE INDEX idx_charges_jargon_term_id ON charges(jargon_term_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to relevant tables
CREATE TRIGGER update_workspaces_updated_at
    BEFORE UPDATE ON workspaces
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jargon_terms_updated_at
    BEFORE UPDATE ON jargon_terms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_channels_updated_at
    BEFORE UPDATE ON channels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jargon_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Workspaces: Users can only see their own workspace
CREATE POLICY "Users can view their own workspace"
    ON workspaces FOR SELECT
    USING (id IN (
        SELECT workspace_id FROM users WHERE slack_id = auth.jwt()->>'sub'
    ));

-- Users: Users can only see users in their workspace
CREATE POLICY "Users can view users in their workspace"
    ON users FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM users WHERE slack_id = auth.jwt()->>'sub'
    ));

-- Jargon Terms: Users can view all terms in their workspace
CREATE POLICY "Users can view jargon terms in their workspace"
    ON jargon_terms FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM users WHERE slack_id = auth.jwt()->>'sub'
    ));

-- Channels: Users can view channels in their workspace
CREATE POLICY "Users can view channels in their workspace"
    ON channels FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM users WHERE slack_id = auth.jwt()->>'sub'
    ));

-- Charges: Users can view charges in their workspace
CREATE POLICY "Users can view charges in their workspace"
    ON charges FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM users WHERE slack_id = auth.jwt()->>'sub'
    )); 
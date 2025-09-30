-- EXAI UI MCP Schema Migration for Supabase
-- This migration adds EXAI-specific tables while preserving existing tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- EXAI Conversations Table (separate from existing conversations)
CREATE TABLE IF NOT EXISTS exai_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    tool_type TEXT NOT NULL, -- 'chat', 'debug', 'analyze', etc.
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_exai_conversations_user_id ON exai_conversations(user_id);
CREATE INDEX idx_exai_conversations_tool_type ON exai_conversations(tool_type);
CREATE INDEX idx_exai_conversations_created_at ON exai_conversations(created_at);

-- EXAI Messages Table
CREATE TABLE IF NOT EXISTS exai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
    content TEXT NOT NULL,
    conversation_id UUID NOT NULL REFERENCES exai_conversations(id) ON DELETE CASCADE,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exai_messages_conversation_id ON exai_messages(conversation_id);
CREATE INDEX idx_exai_messages_created_at ON exai_messages(created_at);

-- EXAI Workflows Table
CREATE TABLE IF NOT EXISTS exai_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES exai_conversations(id) ON DELETE CASCADE,
    tool_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'completed' | 'failed'
    current_step INTEGER NOT NULL DEFAULT 1,
    total_steps INTEGER NOT NULL,
    continuation_id TEXT,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exai_workflows_conversation_id ON exai_workflows(conversation_id);
CREATE INDEX idx_exai_workflows_status ON exai_workflows(status);
CREATE INDEX idx_exai_workflows_tool_type ON exai_workflows(tool_type);

-- EXAI Workflow Steps Table
CREATE TABLE IF NOT EXISTS exai_workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES exai_workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    findings TEXT NOT NULL,
    hypothesis TEXT,
    confidence TEXT, -- 'exploring' | 'low' | 'medium' | 'high' | 'very_high' | 'almost_certain' | 'certain'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'running' | 'completed'
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exai_workflow_steps_workflow_id ON exai_workflow_steps(workflow_id);
CREATE INDEX idx_exai_workflow_steps_step_number ON exai_workflow_steps(step_number);

-- EXAI Files Table
CREATE TABLE IF NOT EXISTS exai_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    size INTEGER NOT NULL,
    type TEXT NOT NULL,
    url TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES exai_conversations(id) ON DELETE SET NULL,
    workflow_step_id UUID REFERENCES exai_workflow_steps(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exai_files_user_id ON exai_files(user_id);
CREATE INDEX idx_exai_files_conversation_id ON exai_files(conversation_id);
CREATE INDEX idx_exai_files_workflow_step_id ON exai_files(workflow_step_id);

-- EXAI Message Attachments Junction Table
CREATE TABLE IF NOT EXISTS exai_message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES exai_messages(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES exai_files(id) ON DELETE CASCADE,
    UNIQUE(message_id, file_id)
);

CREATE INDEX idx_exai_message_attachments_message_id ON exai_message_attachments(message_id);
CREATE INDEX idx_exai_message_attachments_file_id ON exai_message_attachments(file_id);

-- EXAI User Settings Table
CREATE TABLE IF NOT EXISTS exai_user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    default_model TEXT NOT NULL DEFAULT 'glm-4.5-flash',
    default_thinking_mode TEXT NOT NULL DEFAULT 'medium',
    web_search_enabled BOOLEAN NOT NULL DEFAULT true,
    theme TEXT NOT NULL DEFAULT 'system',
    preferences JSONB
);

CREATE INDEX idx_exai_user_settings_user_id ON exai_user_settings(user_id);

-- EXAI Sessions Table (for NextAuth compatibility)
CREATE TABLE IF NOT EXISTS exai_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_token TEXT NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_exai_sessions_user_id ON exai_sessions(user_id);
CREATE INDEX idx_exai_sessions_session_token ON exai_sessions(session_token);

-- Enable Row Level Security (RLS)
ALTER TABLE exai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE exai_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE exai_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE exai_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE exai_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exai_user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exai_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exai_conversations
CREATE POLICY "Users can view own conversations" ON exai_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON exai_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON exai_conversations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON exai_conversations
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for exai_messages
CREATE POLICY "Users can view messages in own conversations" ON exai_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exai_conversations
            WHERE id = exai_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in own conversations" ON exai_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM exai_conversations
            WHERE id = exai_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

-- RLS Policies for exai_workflows
CREATE POLICY "Users can view workflows in own conversations" ON exai_workflows
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exai_conversations
            WHERE id = exai_workflows.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create workflows in own conversations" ON exai_workflows
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM exai_conversations
            WHERE id = exai_workflows.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update workflows in own conversations" ON exai_workflows
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM exai_conversations
            WHERE id = exai_workflows.conversation_id
            AND user_id = auth.uid()
        )
    );

-- RLS Policies for exai_workflow_steps
CREATE POLICY "Users can view workflow steps in own workflows" ON exai_workflow_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exai_workflows w
            JOIN exai_conversations c ON w.conversation_id = c.id
            WHERE w.id = exai_workflow_steps.workflow_id
            AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create workflow steps in own workflows" ON exai_workflow_steps
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM exai_workflows w
            JOIN exai_conversations c ON w.conversation_id = c.id
            WHERE w.id = exai_workflow_steps.workflow_id
            AND c.user_id = auth.uid()
        )
    );

-- RLS Policies for exai_files
CREATE POLICY "Users can view own files" ON exai_files
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upload own files" ON exai_files
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own files" ON exai_files
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for exai_message_attachments
CREATE POLICY "Users can view attachments in own messages" ON exai_message_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exai_messages m
            JOIN exai_conversations c ON m.conversation_id = c.id
            WHERE m.id = exai_message_attachments.message_id
            AND c.user_id = auth.uid()
        )
    );

-- RLS Policies for exai_user_settings
CREATE POLICY "Users can view own settings" ON exai_user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settings" ON exai_user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON exai_user_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for exai_sessions
CREATE POLICY "Users can view own sessions" ON exai_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON exai_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON exai_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON exai_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_exai_conversations_updated_at BEFORE UPDATE ON exai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exai_workflows_updated_at BEFORE UPDATE ON exai_workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for EXAI files
INSERT INTO storage.buckets (id, name, public)
VALUES ('exai-files', 'exai-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for storage
CREATE POLICY "Users can upload own files to storage" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'exai-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own files in storage" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'exai-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own files from storage" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'exai-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );


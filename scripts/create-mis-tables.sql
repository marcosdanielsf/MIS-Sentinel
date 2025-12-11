-- MOTTIVME INTELLIGENCE SYSTEM (MIS)
-- Schema and tables for AI-powered message monitoring and alerts

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS mottivme_intelligence_system;

-- Messages table: stores all WhatsApp messages from monitored groups
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE NOT NULL,
  group_name TEXT NOT NULL,
  group_id TEXT,
  sender_name TEXT NOT NULL,
  sender_phone TEXT,
  message_content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,

  -- AI Analysis fields
  sentiment TEXT, -- positive, negative, neutral, mixed
  urgency_score INTEGER CHECK (urgency_score >= 0 AND urgency_score <= 10),
  category TEXT, -- client_request, team_coordination, automation_opportunity, etc.
  key_topics TEXT[], -- Array of extracted topics

  -- Metadata
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table: AI-generated alerts from message analysis
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL, -- bottleneck, opportunity, urgent_request, pattern_detected, etc.
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Related data
  related_message_ids UUID[],
  affected_team_members TEXT[],
  suggested_actions TEXT[],

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,

  -- AI metadata
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  ai_reasoning TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert recipients: who should be notified about alerts
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.alert_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES mottivme_intelligence_system.alerts(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (if not exists in public schema, create in MIS schema)
CREATE TABLE IF NOT EXISTS mottivme_intelligence_system.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'team_member',
  team_position TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON mottivme_intelligence_system.messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON mottivme_intelligence_system.messages(sender_name);
CREATE INDEX IF NOT EXISTS idx_messages_group ON mottivme_intelligence_system.messages(group_name);
CREATE INDEX IF NOT EXISTS idx_messages_urgency ON mottivme_intelligence_system.messages(urgency_score DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON mottivme_intelligence_system.alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON mottivme_intelligence_system.alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON mottivme_intelligence_system.alerts(created_at DESC);

-- Enable Row Level Security
ALTER TABLE mottivme_intelligence_system.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mottivme_intelligence_system.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mottivme_intelligence_system.alert_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE mottivme_intelligence_system.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies to allow service role access
CREATE POLICY "Allow service role all access on messages" ON mottivme_intelligence_system.messages
  FOR ALL USING (true);

CREATE POLICY "Allow service role all access on alerts" ON mottivme_intelligence_system.alerts
  FOR ALL USING (true);

CREATE POLICY "Allow service role all access on alert_recipients" ON mottivme_intelligence_system.alert_recipients
  FOR ALL USING (true);

CREATE POLICY "Allow service role all access on profiles" ON mottivme_intelligence_system.profiles
  FOR ALL USING (true);

-- Insert sample data for team members
INSERT INTO mottivme_intelligence_system.profiles (email, full_name, team_position) VALUES
  ('marcos@mottivme.com', 'Marcos Daniel', 'CEO'),
  ('isabella@mottivme.com', 'Isabella', 'Team Member'),
  ('allesson@mottivme.com', 'Allesson', 'Team Member'),
  ('arthur@mottivme.com', 'Arthur', 'Team Member'),
  ('hallen@mottivme.com', 'Hallen', 'Team Member')
ON CONFLICT (email) DO NOTHING;
-- OPÇÃO 1: Expor o schema mottivme_intelligence_system na API REST
-- Execute este SQL no Supabase SQL Editor

-- 1. Verificar se as tabelas existem no schema mottivme_intelligence_system
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'mottivme_intelligence_system';

-- 2. Se as tabelas existem lá, vamos criar VIEWS no schema public
-- que apontam para as tabelas do schema mottivme_intelligence_system

-- Drop views se já existirem
DROP VIEW IF EXISTS public.messages CASCADE;
DROP VIEW IF EXISTS public.alerts CASCADE;
DROP VIEW IF EXISTS public.alert_recipients CASCADE;

-- Criar views no schema public
CREATE OR REPLACE VIEW public.messages AS
SELECT * FROM mottivme_intelligence_system.messages;

CREATE OR REPLACE VIEW public.alerts AS
SELECT * FROM mottivme_intelligence_system.alerts;

CREATE OR REPLACE VIEW public.alert_recipients AS
SELECT * FROM mottivme_intelligence_system.alert_recipients;

-- Dar permissões para as views
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_recipients TO anon, authenticated, service_role;

-- IMPORTANTE: Para que INSERT/UPDATE/DELETE funcionem nas views,
-- precisamos criar triggers ou usar INSTEAD OF triggers

-- Trigger para INSERT em messages
CREATE OR REPLACE FUNCTION public.messages_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO mottivme_intelligence_system.messages
  VALUES (NEW.*);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_insert_trigger
INSTEAD OF INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_insert();

-- Trigger para UPDATE em messages
CREATE OR REPLACE FUNCTION public.messages_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mottivme_intelligence_system.messages
  SET
    message_id = NEW.message_id,
    group_name = NEW.group_name,
    group_id = NEW.group_id,
    sender_name = NEW.sender_name,
    sender_phone = NEW.sender_phone,
    message_content = NEW.message_content,
    timestamp = NEW.timestamp,
    sentiment = NEW.sentiment,
    urgency_score = NEW.urgency_score,
    category = NEW.category,
    key_topics = NEW.key_topics,
    raw_data = NEW.raw_data,
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_update_trigger
INSTEAD OF UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_update();

-- Trigger para DELETE em messages
CREATE OR REPLACE FUNCTION public.messages_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM mottivme_intelligence_system.messages
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_delete_trigger
INSTEAD OF DELETE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.messages_delete();

-- Repetir para alerts
CREATE OR REPLACE FUNCTION public.alerts_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO mottivme_intelligence_system.alerts
  VALUES (NEW.*);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alerts_insert_trigger
INSTEAD OF INSERT ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.alerts_insert();

CREATE OR REPLACE FUNCTION public.alerts_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mottivme_intelligence_system.alerts
  SET
    alert_type = NEW.alert_type,
    title = NEW.title,
    description = NEW.description,
    severity = NEW.severity,
    related_message_ids = NEW.related_message_ids,
    affected_team_members = NEW.affected_team_members,
    suggested_actions = NEW.suggested_actions,
    status = NEW.status,
    acknowledged_at = NEW.acknowledged_at,
    acknowledged_by = NEW.acknowledged_by,
    resolved_at = NEW.resolved_at,
    resolved_by = NEW.resolved_by,
    confidence_score = NEW.confidence_score,
    ai_reasoning = NEW.ai_reasoning,
    updated_at = NOW()
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alerts_update_trigger
INSTEAD OF UPDATE ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.alerts_update();

CREATE OR REPLACE FUNCTION public.alerts_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM mottivme_intelligence_system.alerts
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alerts_delete_trigger
INSTEAD OF DELETE ON public.alerts
FOR EACH ROW EXECUTE FUNCTION public.alerts_delete();

-- Repetir para alert_recipients
CREATE OR REPLACE FUNCTION public.alert_recipients_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO mottivme_intelligence_system.alert_recipients
  VALUES (NEW.*);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_recipients_insert_trigger
INSTEAD OF INSERT ON public.alert_recipients
FOR EACH ROW EXECUTE FUNCTION public.alert_recipients_insert();

CREATE OR REPLACE FUNCTION public.alert_recipients_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE mottivme_intelligence_system.alert_recipients
  SET
    alert_id = NEW.alert_id,
    recipient_name = NEW.recipient_name,
    recipient_email = NEW.recipient_email,
    recipient_phone = NEW.recipient_phone,
    notification_sent = NEW.notification_sent,
    notification_sent_at = NEW.notification_sent_at
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_recipients_update_trigger
INSTEAD OF UPDATE ON public.alert_recipients
FOR EACH ROW EXECUTE FUNCTION public.alert_recipients_update();

CREATE OR REPLACE FUNCTION public.alert_recipients_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM mottivme_intelligence_system.alert_recipients
  WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_recipients_delete_trigger
INSTEAD OF DELETE ON public.alert_recipients
FOR EACH ROW EXECUTE FUNCTION public.alert_recipients_delete();

-- Verificar que tudo funcionou
SELECT 'Views criadas com sucesso!' as status;
SELECT table_name, table_type FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('messages', 'alerts', 'alert_recipients');
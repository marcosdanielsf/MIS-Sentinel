-- SQL para usar no node Postgres do N8N
-- Inserir relatório de prospecção do Lucas

INSERT INTO mottivme_intelligence_system.prospection_reports (
  client_name,
  prospections_count,
  reported_by,
  report_date,
  source_group,
  raw_message
) VALUES (
  '{{ $json.client_name }}',
  {{ $json.prospections_count }},
  '{{ $json.reported_by }}',
  '{{ $json.report_date }}'::date,
  '{{ $json.source_group }}',
  $$${{ $json.raw_message }}$$$
)
ON CONFLICT (client_name, report_date, reported_by)
DO UPDATE SET
  prospections_count = prospection_reports.prospections_count + EXCLUDED.prospections_count,
  updated_at = NOW()
RETURNING id, client_name, prospections_count, report_date;

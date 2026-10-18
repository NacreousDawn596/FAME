-- FAME V3 — allow global (non-campaign) audit events

ALTER TABLE queue_event ALTER COLUMN campaign_id DROP NOT NULL;

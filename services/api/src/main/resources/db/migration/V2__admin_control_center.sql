-- FAME V2 — superadmin control center

CREATE TABLE app_setting (
    key         VARCHAR(120) PRIMARY KEY,
    value       TEXT        NOT NULL,
    description VARCHAR(500),
    updated_at  TIMESTAMPTZ NOT NULL,
    updated_by  VARCHAR(120)
);

CREATE TABLE notification_template (
    id         UUID PRIMARY KEY,
    name       VARCHAR(120) NOT NULL UNIQUE,
    title      VARCHAR(200) NOT NULL,
    body       TEXT        NOT NULL,
    type       VARCHAR(60),
    route      VARCHAR(300),
    active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE broadcast (
    id              UUID PRIMARY KEY,
    campaign_id     UUID,
    segment         VARCHAR(80)  NOT NULL,
    title           VARCHAR(200) NOT NULL,
    body            TEXT         NOT NULL,
    type            VARCHAR(60),
    route           VARCHAR(300),
    channel         VARCHAR(20),
    status          VARCHAR(20)  NOT NULL,
    target_count    INT          NOT NULL DEFAULT 0,
    delivered_count INT          NOT NULL DEFAULT 0,
    failed_count    INT          NOT NULL DEFAULT 0,
    actor_id        VARCHAR(120),
    created_at      TIMESTAMPTZ  NOT NULL,
    sent_at         TIMESTAMPTZ
);
CREATE INDEX idx_broadcast_status ON broadcast(status);
CREATE INDEX idx_broadcast_campaign ON broadcast(campaign_id);

CREATE TABLE broadcast_recipient (
    id              UUID PRIMARY KEY,
    broadcast_id    UUID        NOT NULL REFERENCES broadcast(id) ON DELETE CASCADE,
    registration_id UUID        NOT NULL REFERENCES student_registration(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL,
    attempts        INT         NOT NULL DEFAULT 0,
    sent_at         TIMESTAMPTZ,
    last_error      VARCHAR(500),
    CONSTRAINT uq_broadcast_recipient UNIQUE (broadcast_id, registration_id)
);
CREATE INDEX idx_broadcast_recipient_status ON broadcast_recipient(status);
CREATE INDEX idx_broadcast_recipient_reg ON broadcast_recipient(registration_id);

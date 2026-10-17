-- FAME initial schema (V1)

CREATE TABLE app_user (
    id            UUID PRIMARY KEY,
    username      VARCHAR(64)  NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    display_name  VARCHAR(120) NOT NULL,
    photo_url     VARCHAR(512),
    role          VARCHAR(20)  NOT NULL,
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL
);

CREATE TABLE company (
    id          UUID PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    description VARCHAR(2000),
    logo_url    VARCHAR(512),
    created_at  TIMESTAMPTZ  NOT NULL
);

CREATE TABLE recruiter (
    id         UUID PRIMARY KEY,
    company_id UUID         NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    full_name  VARCHAR(120) NOT NULL,
    email      VARCHAR(320),
    title      VARCHAR(120),
    photo_url  VARCHAR(512),
    created_at TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_recruiter_company ON recruiter(company_id);

CREATE TABLE campaign (
    id                     UUID PRIMARY KEY,
    name                   VARCHAR(200) NOT NULL,
    company_id             UUID         NOT NULL REFERENCES company(id),
    owner_id               UUID         NOT NULL REFERENCES app_user(id),
    description            VARCHAR(2000),
    location               VARCHAR(300),
    starts_at              TIMESTAMPTZ,
    ends_at                TIMESTAMPTZ,
    status                 VARCHAR(20)  NOT NULL,
    public_display_enabled BOOLEAN      NOT NULL DEFAULT FALSE,
    public_display_mode    VARCHAR(20),
    created_at             TIMESTAMPTZ  NOT NULL,
    updated_at             TIMESTAMPTZ  NOT NULL,
    version                BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_campaign_status ON campaign(status);

CREATE TABLE campaign_member (
    campaign_id UUID        NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_campaign_member UNIQUE (campaign_id, user_id)
);

CREATE TABLE roster_entry (
    id           UUID PRIMARY KEY,
    campaign_id  UUID         NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    student_code VARCHAR(64)  NOT NULL,
    email        VARCHAR(320),
    full_name    VARCHAR(200),
    filiere      VARCHAR(200),
    import_batch VARCHAR(64),
    created_at   TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_roster_identity UNIQUE (campaign_id, student_code)
);
CREATE INDEX idx_roster_campaign ON roster_entry(campaign_id);

CREATE TABLE station (
    id             UUID PRIMARY KEY,
    campaign_id    UUID         NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    recruiter_id   UUID         REFERENCES recruiter(id) ON DELETE SET NULL,
    label          VARCHAR(120) NOT NULL,
    location_label VARCHAR(120),
    filiere        VARCHAR(200),
    status         VARCHAR(20)  NOT NULL,
    pos_x          DOUBLE PRECISION NOT NULL,
    pos_y          DOUBLE PRECISION NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL,
    version        BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_station_campaign ON station(campaign_id);

CREATE TABLE student_registration (
    id                   UUID PRIMARY KEY,
    campaign_id          UUID         NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    student_code         VARCHAR(64)  NOT NULL,
    email                VARCHAR(320),
    full_name            VARCHAR(200),
    filiere              VARCHAR(200),
    sequence_no          BIGINT       NOT NULL,
    arrival_at           TIMESTAMPTZ  NOT NULL,
    status               VARCHAR(20)  NOT NULL,
    station_id           UUID         REFERENCES station(id) ON DELETE SET NULL,
    recovery_account     BOOLEAN      NOT NULL DEFAULT FALSE,
    called_at            TIMESTAMPTZ,
    interview_started_at TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ,
    withdrawn_at         TIMESTAMPTZ,
    registered_at        TIMESTAMPTZ  NOT NULL,
    version              BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT uq_registration_student_campaign UNIQUE (campaign_id, student_code)
);
CREATE INDEX idx_registration_campaign_seq ON student_registration(campaign_id, sequence_no);
CREATE INDEX idx_registration_campaign_filiere ON student_registration(campaign_id, filiere);
CREATE INDEX idx_registration_status ON student_registration(status);

CREATE TABLE queue_event (
    id          UUID PRIMARY KEY,
    campaign_id UUID         NOT NULL,
    entity_type VARCHAR(40)  NOT NULL,
    entity_id   VARCHAR(64),
    actor_id    VARCHAR(64),
    actor_role  VARCHAR(20),
    action      VARCHAR(80)  NOT NULL,
    occurred_at TIMESTAMPTZ  NOT NULL,
    metadata    TEXT
);
CREATE INDEX idx_queue_event_campaign ON queue_event(campaign_id, occurred_at);

CREATE TABLE auth_challenge (
    id          UUID PRIMARY KEY,
    challenge   VARCHAR(128) NOT NULL UNIQUE,
    nonce       VARCHAR(128) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    consumed_at TIMESTAMPTZ
);
CREATE INDEX idx_auth_challenge_expiry ON auth_challenge(expires_at);

CREATE TABLE push_subscription (
    id              UUID PRIMARY KEY,
    registration_id UUID REFERENCES student_registration(id) ON DELETE CASCADE,
    endpoint        TEXT        NOT NULL,
    p256dh          TEXT        NOT NULL,
    auth            VARCHAR(64) NOT NULL,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_push_subscription_reg ON push_subscription(registration_id);

CREATE SEQUENCE registration_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE recovery_account (
    id                   UUID PRIMARY KEY,
    campaign_id          UUID         NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
    student_code         VARCHAR(64)  NOT NULL,
    email                VARCHAR(320),
    full_name            VARCHAR(200),
    filiere              VARCHAR(200),
    username             VARCHAR(64)  NOT NULL UNIQUE,
    password_hash        VARCHAR(100) NOT NULL,
    must_change_password BOOLEAN      NOT NULL DEFAULT TRUE,
    expires_at           TIMESTAMPTZ  NOT NULL,
    used_at              TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL
);

CREATE TABLE notification_record (
    id              UUID PRIMARY KEY,
    registration_id UUID,
    event_type      VARCHAR(60)  NOT NULL,
    dedup_key       VARCHAR(160) NOT NULL UNIQUE,
    payload         TEXT,
    status          VARCHAR(20)  NOT NULL,
    attempts        INT          NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL,
    sent_at         TIMESTAMPTZ,
    last_error      VARCHAR(500)
);
CREATE INDEX idx_notification_status ON notification_record(status);

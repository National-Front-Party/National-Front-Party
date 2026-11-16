-- Party platform database schema based on the provided ERD.
-- PostgreSQL 13+

BEGIN;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE staff_users (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name   text        NOT NULL,
    email       text        NOT NULL UNIQUE,
    role        text        NOT NULL,
    is_active   boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE governorates (
    id          smallint    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name_ar     text        NOT NULL,
    code        text        NOT NULL UNIQUE,
    sort_order  smallint    NOT NULL DEFAULT 0,
    is_active   boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE membership_applications (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    application_no   bigint      GENERATED ALWAYS AS IDENTITY UNIQUE,
    full_name        text        NOT NULL,
    birth_date       date        NOT NULL,
    gender           text        NOT NULL,
    phone            text        NOT NULL,
    national_id      char(14)    NOT NULL CHECK (national_id ~ '^[0-9]{14}$'),
    education_level  text,
    occupation       text,
    governorate_id   smallint    NOT NULL
                     REFERENCES governorates (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    terms_accepted   boolean     NOT NULL DEFAULT false,
    status           text        NOT NULL DEFAULT 'new',
    assigned_to      uuid
                     REFERENCES staff_users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    reviewed_by      uuid
                     REFERENCES staff_users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    reviewed_at      timestamptz,
    rejection_reason text,
    internal_notes   text,
    source           text,
    submitted_ip     inet,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE members (
    id             uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id uuid     NOT NULL UNIQUE
                   REFERENCES membership_applications (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    membership_no  bigint   GENERATED ALWAYS AS IDENTITY UNIQUE,
    governorate_id smallint NOT NULL
                   REFERENCES governorates (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    status         text     NOT NULL DEFAULT 'active',
    joined_at      date     NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE application_status_history (
    id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    application_id uuid        NOT NULL
                   REFERENCES membership_applications (id) ON UPDATE CASCADE ON DELETE CASCADE,
    from_status    text,
    to_status      text        NOT NULL,
    changed_by     uuid
                   REFERENCES staff_users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    note           text,
    changed_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE panels (
    id               smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug             text     NOT NULL UNIQUE,
    title            text     NOT NULL,
    subtitle         text,
    icon             text,
    leaders_heading  text,
    sort_order       smallint NOT NULL DEFAULT 0,
    is_published     boolean  NOT NULL DEFAULT false
);

CREATE TABLE leaders (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id     smallint    NOT NULL
                 REFERENCES panels (id) ON UPDATE CASCADE ON DELETE CASCADE,
    full_name    text        NOT NULL,
    role_title   text,
    photo_url    text,
    badge_label  text,
    is_head      boolean     NOT NULL DEFAULT false,
    sort_order   smallint    NOT NULL DEFAULT 0,
    is_published boolean     NOT NULL DEFAULT false,
    updated_by   uuid
                 REFERENCES staff_users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE info_items (
    id           smallint    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug         text        NOT NULL UNIQUE,
    title        text        NOT NULL,
    body         text,
    source_note  text,
    link_url     text,
    link_label   text,
    icon         text,
    sort_order   smallint    NOT NULL DEFAULT 0,
    is_published boolean     NOT NULL DEFAULT false,
    updated_by   uuid
                 REFERENCES staff_users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    kind         text,
    button_style text,
    action_type  text,
    panel_id     smallint
                 REFERENCES panels (id) ON UPDATE CASCADE ON DELETE SET NULL,
    leader_id    uuid
                 REFERENCES leaders (id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE central_secretariats (
    id           smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    info_item_id smallint NOT NULL
                 REFERENCES info_items (id) ON UPDATE CASCADE ON DELETE CASCADE,
    name_ar      text     NOT NULL,
    head_name    text,
    source_note  text,
    sort_order   smallint NOT NULL DEFAULT 0,
    is_published boolean  NOT NULL DEFAULT false
);

CREATE TABLE governorate_secretariats_info (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    governorate_id smallint    NOT NULL
                   REFERENCES governorates (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    full_name      text        NOT NULL,
    role_title     text,
    photo_url      text,
    sort_order     smallint    NOT NULL DEFAULT 0,
    is_published   boolean     NOT NULL DEFAULT false,
    updated_by     uuid
                   REFERENCES staff_users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE parliamentary_unit_items (
    id           smallint    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug         text        NOT NULL UNIQUE,
    title        text        NOT NULL,
    subtitle     text,
    icon         text,
    head_name    text,
    head_role    text,
    body         text,
    source_note  text,
    sort_order   smallint    NOT NULL DEFAULT 0,
    is_published boolean     NOT NULL DEFAULT false,
    updated_by   uuid
                 REFERENCES staff_users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ministries (
    id          smallint    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug        text        NOT NULL UNIQUE,
    name_ar     text        NOT NULL,
    sort_order  smallint    NOT NULL DEFAULT 0,
    is_active   boolean     NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE request_sectors (
    id          smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        text     NOT NULL UNIQUE,
    name_ar     text     NOT NULL,
    sort_order  smallint NOT NULL DEFAULT 0,
    is_active   boolean  NOT NULL DEFAULT true
);

CREATE TABLE service_requests (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    request_no     bigint      GENERATED ALWAYS AS IDENTITY UNIQUE,
    full_name      text        NOT NULL,
    phone          text        NOT NULL,
    ministry_id    smallint    NOT NULL
                   REFERENCES ministries (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    sector_id      smallint    NOT NULL
                   REFERENCES request_sectors (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    status         text        NOT NULL DEFAULT 'new',
    assigned_to    uuid
                   REFERENCES staff_users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    internal_notes text,
    source         text,
    submitted_ip   inet,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_apps_governorate     ON membership_applications (governorate_id);
CREATE INDEX idx_apps_assigned_to     ON membership_applications (assigned_to);
CREATE INDEX idx_apps_reviewed_by     ON membership_applications (reviewed_by);
CREATE INDEX idx_apps_status          ON membership_applications (status);
CREATE INDEX idx_members_governorate  ON members (governorate_id);
CREATE INDEX idx_hist_application     ON application_status_history (application_id, changed_at);
CREATE INDEX idx_hist_changed_by      ON application_status_history (changed_by);
CREATE INDEX idx_leaders_panel        ON leaders (panel_id);
CREATE INDEX idx_leaders_updated_by   ON leaders (updated_by);
CREATE INDEX idx_info_updated_by      ON info_items (updated_by);
CREATE INDEX idx_info_panel           ON info_items (panel_id);
CREATE INDEX idx_info_leader          ON info_items (leader_id);
CREATE INDEX idx_central_info_item    ON central_secretariats (info_item_id);
CREATE INDEX idx_govsec_governorate   ON governorate_secretariats_info (governorate_id);
CREATE INDEX idx_govsec_updated_by    ON governorate_secretariats_info (updated_by);
CREATE INDEX idx_parl_updated_by      ON parliamentary_unit_items (updated_by);
CREATE INDEX idx_sr_ministry          ON service_requests (ministry_id);
CREATE INDEX idx_sr_sector            ON service_requests (sector_id);
CREATE INDEX idx_sr_assigned_to       ON service_requests (assigned_to);
CREATE INDEX idx_sr_status            ON service_requests (status);

CREATE TRIGGER trg_apps_updated_at
    BEFORE UPDATE ON membership_applications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leaders_updated_at
    BEFORE UPDATE ON leaders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_info_updated_at
    BEFORE UPDATE ON info_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_govsec_updated_at
    BEFORE UPDATE ON governorate_secretariats_info
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_parl_updated_at
    BEFORE UPDATE ON parliamentary_unit_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sr_updated_at
    BEFORE UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE VIEW v_members_with_governorate AS
SELECT m.*, g.name_ar AS governorate_name_ar
FROM members m
JOIN governorates g ON g.id = m.governorate_id;

DO $$
DECLARE
    expected_tables text[] := ARRAY[
        'governorates', 'members', 'membership_applications', 'staff_users',
        'application_status_history', 'info_items', 'panels', 'leaders',
        'central_secretariats', 'governorate_secretariats_info',
        'parliamentary_unit_items', 'ministries', 'request_sectors', 'service_requests'
    ];
    table_name text;
    fk_count int;
BEGIN
    FOREACH table_name IN ARRAY expected_tables LOOP
        IF to_regclass('public.' || table_name) IS NULL THEN
            RAISE EXCEPTION 'Missing table: %', table_name;
        END IF;
    END LOOP;

    SELECT count(*) INTO fk_count
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND cl.relname = ANY(expected_tables);

    IF fk_count <> 19 THEN
        RAISE EXCEPTION 'Expected 19 foreign keys across the ERD tables, found %', fk_count;
    END IF;
END $$;

COMMIT;

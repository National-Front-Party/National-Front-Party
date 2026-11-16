-- Add the News section from ERD v7 without modifying the party platform schema.

BEGIN;

CREATE TABLE news_sources (
    id         smallint    GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug       text        NOT NULL UNIQUE,
    name_ar    text        NOT NULL,
    sort_order smallint    NOT NULL DEFAULT 0,
    is_active  boolean     NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE news_articles (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug           text        NOT NULL UNIQUE,
    title          text        NOT NULL,
    body           text        NOT NULL,
    image_url      text,
    image_alt      text,
    source_id      smallint    NOT NULL
                   REFERENCES news_sources (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    source_url     text,
    published_on   date        NOT NULL,
    date_precision text        NOT NULL DEFAULT 'day'
                   CHECK (date_precision IN ('day', 'month')),
    is_featured    boolean     NOT NULL DEFAULT false,
    sort_order     smallint    NOT NULL DEFAULT 0,
    is_published   boolean     NOT NULL DEFAULT false,
    updated_by     uuid
                   REFERENCES staff_users (id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_articles_source_id
    ON news_articles (source_id);
CREATE INDEX idx_news_articles_updated_by
    ON news_articles (updated_by);
CREATE INDEX idx_news_articles_published_listing
    ON news_articles (is_published, published_on DESC);

CREATE TRIGGER trg_news_articles_updated_at
    BEFORE UPDATE ON news_articles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DO $$
DECLARE
    expected_tables text[] := ARRAY[
        'governorates', 'members', 'membership_applications', 'staff_users',
        'application_status_history', 'info_items', 'panels', 'leaders',
        'central_secretariats', 'governorate_secretariats_info',
        'parliamentary_unit_items', 'ministries', 'request_sectors',
        'service_requests', 'news_sources', 'news_articles'
    ];
    table_name text;
    table_count int;
    fk_count int;
BEGIN
    FOREACH table_name IN ARRAY expected_tables LOOP
        IF to_regclass(format('%I.%I', 'public', table_name)) IS NULL THEN
            RAISE EXCEPTION 'Missing table: %', table_name;
        END IF;
    END LOOP;

    SELECT count(*) INTO table_count
    FROM pg_class cl
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE cl.relkind = 'r'
      AND n.nspname = 'public'
      AND cl.relname = ANY(expected_tables);

    IF table_count <> 16 THEN
        RAISE EXCEPTION 'Expected 16 ERD tables, found %', table_count;
    END IF;

    SELECT count(*) INTO fk_count
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND cl.relname = ANY(expected_tables);

    IF fk_count <> 21 THEN
        RAISE EXCEPTION 'Expected 21 foreign keys across the ERD tables, found %', fk_count;
    END IF;
END $$;

COMMIT;

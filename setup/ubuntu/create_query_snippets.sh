sudo -u postgres -i
psql -c "
create table query_snippets (
          id integer NOT NULL
, org_id integer NOT NULL
, trigger character varying  NOT NULL UNIQUE
, description text NOT NULL
, user_id integer NOT NULL
, snippet text NOT NULL
, updated_at timestamp with time zone NOT NULL
, created_at timestamp with time zone NOT NULL
);
ALTER TABLE public.query_snippets OWNER TO redash;
CREATE SEQUENCE query_snippets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER TABLE public.query_snippets_id_seq OWNER TO redash;
ALTER SEQUENCE query_snippets_id_seq OWNED BY query_snippets.id;
ALTER TABLE ONLY query_snippets ALTER COLUMN id SET DEFAULT nextval('groups_id_seq'::regclass);
ALTER TABLE ONLY query_snippets
    ADD CONSTRAINT query_snippets_pkey PRIMARY KEY (id);
CREATE INDEX query_snippets_org_id ON query_snippets USING btree (org_id);
CREATE INDEX query_snippets_user_id ON query_snippets USING btree (user_id);
ALTER TABLE ONLY query_snippets
    ADD CONSTRAINT query_snippets_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id);
ALTER TABLE ONLY query_snippets
    ADD CONSTRAINT query_snippets_user_id_fkey FOREIGN KEY (org_id) REFERENCES users(id);
" redash

psql -c "grant select on query_snippets to redash_reader;" redash

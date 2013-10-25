CREATE TABLE query_results (
  id serial,
  query_hash char(32),
  retrieved_at timestamptz,
  runtime float,
  data text,
  query text
);

CREATE TABLE queries (
  id serial primary key,
  selected_query_data_id int,
  latest_query_data_id int,
  name varchar(255),
  description varchar(4096),
  query text,
  query_hash char(32),
  ttl int,
  user varchar(360),
  created_at timestamptz default current_timestamp
);

BEGIN;
CREATE TABLE "queries" (
    "id" serial NOT NULL PRIMARY KEY,
    "latest_query_data_id" integer NOT NULL,
    "name" varchar(255) NOT NULL,
    "description" varchar(4096) NOT NULL,
    "query" text NOT NULL,
    "query_hash" varchar(32) NOT NULL,
    "ttl" integer NOT NULL,
    "user" varchar(360) NOT NULL,
    "created_at" timestamp with time zone NOT NULL
)
;
CREATE TABLE "query_results" (
    "id" serial NOT NULL PRIMARY KEY,
    "query_hash" varchar(32) NOT NULL,
    "query" text NOT NULL,
    "data" text NOT NULL,
    "runtime" double precision NOT NULL,
    "retrieved_at" timestamp with time zone NOT NULL
)
;
CREATE TABLE "dashboards" (
    "id" serial NOT NULL PRIMARY KEY,
    "slug" varchar(140) NOT NULL,
    "name" varchar(100) NOT NULL,
    "user" varchar(360) NOT NULL,
    "layout" text NOT NULL,
    "is_archived" boolean NOT NULL
)
;
CREATE TABLE "widgets" (
    "id" serial NOT NULL PRIMARY KEY,
    "query_id" integer NOT NULL REFERENCES "queries" ("id") DEFERRABLE INITIALLY DEFERRED,
    "type" varchar(100) NOT NULL,
    "width" integer NOT NULL,
    "options" text NOT NULL,
    "dashboard_id" integer NOT NULL REFERENCES "dashboards" ("id") DEFERRABLE INITIALLY DEFERRED
)
;
CREATE INDEX "dashboards_slug" ON "dashboards" ("slug");
CREATE INDEX "dashboards_slug_like" ON "dashboards" ("slug" varchar_pattern_ops);
CREATE INDEX "widgets_query_id" ON "widgets" ("query_id");
CREATE INDEX "widgets_dashboard_id" ON "widgets" ("dashboard_id");

COMMIT;
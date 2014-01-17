BEGIN;
CREATE TABLE "query_results" (
    "id" serial NOT NULL PRIMARY KEY,
    "query_hash" varchar(32) NOT NULL,
    "query" text NOT NULL,
    "data" text NOT NULL,
    "runtime" double precision NOT NULL,
    "retrieved_at" timestamp with time zone NOT NULL
)
;
CREATE TABLE "queries" (
    "id" serial NOT NULL PRIMARY KEY,
    "latest_query_data_id" integer REFERENCES "query_results" ("id") DEFERRABLE INITIALLY DEFERRED,
    "name" varchar(255) NOT NULL,
    "description" varchar(4096),
    "query" text NOT NULL,
    "query_hash" varchar(32) NOT NULL,
    "api_key" varchar(40),
    "ttl" integer NOT NULL,
    "user" varchar(360) NOT NULL,
    "created_at" timestamp with time zone NOT NULL
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
CREATE TABLE "visualizations" (
    "id" serial NOT NULL PRIMARY KEY,
    "type" varchar(100) NOT NULL,
    "query_id" integer NOT NULL REFERENCES "queries" ("id") DEFERRABLE INITIALLY DEFERRED,
    "name" varchar(255) NOT NULL,
    "description" varchar(4096),
    "options" text NOT NULL
)
;
CREATE TABLE "widgets" (
    "id" serial NOT NULL PRIMARY KEY,
    "type" varchar(100) NOT NULL,
    "width" integer NOT NULL,
    "options" text NOT NULL,
    "query_id" integer,
    "visualization_id" integer NOT NULL REFERENCES "visualizations" ("id") DEFERRABLE INITIALLY DEFERRED,
    "dashboard_id" integer NOT NULL REFERENCES "dashboards" ("id") DEFERRABLE INITIALLY DEFERRED
)
;
CREATE INDEX "queries_latest_query_data_id" ON "queries" ("latest_query_data_id");
CREATE INDEX "widgets_query_id" ON "widgets" ("query_id");
CREATE INDEX "widgets_dashboard_id" ON "widgets" ("dashboard_id");

COMMIT;

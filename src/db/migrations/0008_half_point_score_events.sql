ALTER TABLE "score_events"
  ALTER COLUMN "points" TYPE double precision
  USING "points"::double precision;

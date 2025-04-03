-- Fix the survey_responses table structure to match what we have in PostgreSQL
-- First create a temporary table with the new structure
CREATE TABLE survey_responses_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  email TEXT,
  responses TEXT NOT NULL,
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Drop the old table
DROP TABLE IF EXISTS survey_responses;

-- Rename the new table to the original name
ALTER TABLE survey_responses_new RENAME TO survey_responses;
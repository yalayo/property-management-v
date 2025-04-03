-- Update survey_responses table to match the schema definition
-- We can't drop columns in SQLite, so we'll recreate the table with the correct structure

-- First create a temporary table with the new structure
CREATE TABLE survey_responses_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  question_id INTEGER NOT NULL,
  response TEXT NOT NULL,
  ip_address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Copy existing data if needed (mapping old responses to new format)
-- If you have existing data, you'd need to parse the JSON responses
-- and create individual rows for each question
-- For now, we'll just create a fresh table since this is early development

-- Drop the old table
DROP TABLE survey_responses;

-- Rename the new table to the original name
ALTER TABLE survey_responses_new RENAME TO survey_responses;
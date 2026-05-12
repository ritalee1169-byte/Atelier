-- Map each chunk to its source email (null for intro/outro chunks)
ALTER TABLE episode_chunks ADD COLUMN IF NOT EXISTS source_email_idx int;

-- Gmail message id for opening the original email directly
ALTER TABLE raw_emails ADD COLUMN IF NOT EXISTS gmail_message_id text;

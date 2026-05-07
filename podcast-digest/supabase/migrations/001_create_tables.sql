CREATE TABLE episodes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date         date UNIQUE NOT NULL,
  title        text NOT NULL,
  summary_text text NOT NULL,
  audio_url    text NOT NULL,
  duration_sec integer,
  source_count integer,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE raw_emails (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id  uuid REFERENCES episodes(id) ON DELETE CASCADE,
  sender      text,
  subject     text,
  received_at timestamptz
);

CREATE TABLE notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question      text NOT NULL,
  answer        text NOT NULL,
  source_chunks uuid[],
  episode_ids   uuid[],
  tags          text[] DEFAULT '{}',
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read episodes" ON episodes FOR SELECT USING (true);
CREATE POLICY "public read notes" ON notes FOR SELECT USING (true);
CREATE POLICY "public insert notes" ON notes FOR INSERT WITH CHECK (true);

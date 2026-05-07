CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE episode_chunks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  episode_id   uuid REFERENCES episodes(id) ON DELETE CASCADE,
  chunk_index  integer NOT NULL,
  content      text NOT NULL,
  embedding    vector(1536)
);

CREATE INDEX ON episode_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE episode_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read chunks" ON episode_chunks FOR SELECT USING (true);

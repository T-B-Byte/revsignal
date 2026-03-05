-- ============================================================================
-- RevSignal: Flashcards Migration
-- Flashcard decks, cards, quiz sessions, and quiz responses
-- for knowledge drilling and spaced repetition.
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE card_type AS ENUM (
  'standard',
  'fill_blank',
  'image'
);

CREATE TYPE mastery_level AS ENUM (
  'new',
  'learning',
  'reviewing',
  'mastered'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. flashcard_decks (parent container for topic-based card groups)
CREATE TABLE flashcard_decks (
  deck_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  icon            text DEFAULT 'cards',
  color           text DEFAULT 'blue',
  card_count      int NOT NULL DEFAULT 0,
  mastery_pct     numeric(5,2) NOT NULL DEFAULT 0,
  last_studied_at timestamptz,
  sort_order      int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. flashcards (individual cards within a deck)
CREATE TABLE flashcards (
  card_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id           uuid NOT NULL REFERENCES flashcard_decks(deck_id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_type         card_type NOT NULL DEFAULT 'standard',
  front_content     text NOT NULL,
  back_content      text NOT NULL,
  back_detail       text,
  image_url         text,
  source_attribution text,
  times_seen        int NOT NULL DEFAULT 0,
  times_correct     int NOT NULL DEFAULT 0,
  mastery           mastery_level NOT NULL DEFAULT 'new',
  last_seen_at      timestamptz,
  sort_order        int NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 3. quiz_sessions (tracks each quiz attempt)
CREATE TABLE quiz_sessions (
  session_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id             uuid NOT NULL REFERENCES flashcard_decks(deck_id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_cards         int NOT NULL DEFAULT 0,
  first_pass_correct  int NOT NULL DEFAULT 0,
  final_correct       int NOT NULL DEFAULT 0,
  completed           boolean NOT NULL DEFAULT false,
  started_at          timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz
);

-- 4. quiz_responses (per-card response within a quiz session)
CREATE TABLE quiz_responses (
  response_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES quiz_sessions(session_id) ON DELETE CASCADE,
  card_id         uuid NOT NULL REFERENCES flashcards(card_id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attempt_number  int NOT NULL DEFAULT 1,
  is_correct      boolean NOT NULL,
  responded_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- flashcard_decks
CREATE INDEX idx_flashcard_decks_user_id ON flashcard_decks(user_id);
CREATE INDEX idx_flashcard_decks_user_id_sort ON flashcard_decks(user_id, sort_order);

-- flashcards
CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id);
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_flashcards_deck_id_sort ON flashcards(deck_id, sort_order, created_at);
CREATE INDEX idx_flashcards_user_id_mastery ON flashcards(user_id, mastery);

-- quiz_sessions
CREATE INDEX idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX idx_quiz_sessions_deck_id ON quiz_sessions(deck_id);
CREATE INDEX idx_quiz_sessions_user_id_completed ON quiz_sessions(user_id, completed, completed_at DESC);
CREATE INDEX idx_quiz_sessions_deck_id_completed ON quiz_sessions(deck_id, completed, completed_at DESC);

-- quiz_responses
CREATE INDEX idx_quiz_responses_session_id ON quiz_responses(session_id);
CREATE INDEX idx_quiz_responses_card_id ON quiz_responses(card_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- updated_at triggers (reuse function from 001)
CREATE TRIGGER trg_flashcard_decks_updated_at
  BEFORE UPDATE ON flashcard_decks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_flashcards_updated_at
  BEFORE UPDATE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-sync card_count on flashcard_decks
CREATE OR REPLACE FUNCTION update_deck_card_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE flashcard_decks SET card_count = card_count + 1, updated_at = now() WHERE deck_id = NEW.deck_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE flashcard_decks SET card_count = GREATEST(card_count - 1, 0), updated_at = now() WHERE deck_id = OLD.deck_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_flashcard_count
  AFTER INSERT OR DELETE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_deck_card_count();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- flashcard_decks
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flashcard_decks_select" ON flashcard_decks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "flashcard_decks_insert" ON flashcard_decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "flashcard_decks_update" ON flashcard_decks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "flashcard_decks_delete" ON flashcard_decks
  FOR DELETE USING (auth.uid() = user_id);

-- flashcards
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flashcards_select" ON flashcards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "flashcards_insert" ON flashcards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "flashcards_update" ON flashcards
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "flashcards_delete" ON flashcards
  FOR DELETE USING (auth.uid() = user_id);

-- quiz_sessions
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_sessions_select" ON quiz_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quiz_sessions_insert" ON quiz_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quiz_sessions_update" ON quiz_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "quiz_sessions_delete" ON quiz_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- quiz_responses
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_responses_select" ON quiz_responses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quiz_responses_insert" ON quiz_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quiz_responses_delete" ON quiz_responses
  FOR DELETE USING (auth.uid() = user_id);

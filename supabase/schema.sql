-- ========================================================
-- CINEMAVERSE PRO — SUPABASE DATABASE SCHEMA
-- Features: User Authentication, Session Login/Logout Logs,
--           and Cloud Watch History / Continue Watching Sync.
-- Conforms strictly to Supabase Best Practices & Security Guidelines.
-- ========================================================

-- 1. Create User Sessions Table (Tracks Login & Logout Timestamps)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  login_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  logout_time TIMESTAMPTZ,
  session_duration_seconds INTEGER,
  user_agent TEXT,
  device_info TEXT,
  ip_address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for quick lookups by user and login timestamp
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_login_time ON public.user_sessions(login_time DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_sessions
CREATE POLICY "Users can view own sessions"
  ON public.user_sessions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.user_sessions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.user_sessions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Explicitly grant permissions to authenticated role
GRANT ALL ON TABLE public.user_sessions TO authenticated;


-- 2. Create Watch History Table (Cloud Continue Watching & Progress)
CREATE TABLE IF NOT EXISTS public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'movie', -- 'movie' or 'series'
  season INTEGER DEFAULT 1,
  episode INTEGER DEFAULT 1,
  progress_seconds INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  poster TEXT,
  backdrop TEXT,
  platform TEXT,
  platform_id TEXT,
  last_watched TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, media_id)
);

-- Index for quick lookups by user and last watched timestamp
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_last_watched ON public.watch_history(last_watched DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for watch_history
CREATE POLICY "Users can view own watch history"
  ON public.watch_history FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own watch history"
  ON public.watch_history FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own watch history"
  ON public.watch_history FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own watch history"
  ON public.watch_history FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Explicitly grant permissions to authenticated role
GRANT ALL ON TABLE public.watch_history TO authenticated;

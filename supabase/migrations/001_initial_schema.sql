-- XUBI: Apprentice Learning Portal - Database Schema Migration
-- This file contains all table definitions, RLS policies, triggers, and functions.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CORE TABLES
-- ============================================

-- Departments (Guilds/Categories)
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT '📋',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'apprentice' CHECK (role IN ('apprentice', 'junior_staff', 'instructor', 'admin')),
  knowledge_score INTEGER NOT NULL DEFAULT 0,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  muted_until TIMESTAMPTZ,
  mute_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Threads
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  skill_level INTEGER NOT NULL DEFAULT 1 CHECK (skill_level BETWEEN 1 AND 5),
  response_mode TEXT NOT NULL DEFAULT 'open' CHECK (response_mode IN ('open', 'icon_only', 'guided')),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  focus_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Posts (Replies/Comments)
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  body TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  is_solution BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reactions
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id, emoji),
  UNIQUE(user_id, thread_id, emoji),
  CHECK ((post_id IS NOT NULL AND thread_id IS NULL) OR (post_id IS NULL AND thread_id IS NOT NULL))
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT
);

-- Thread Tags (many-to-many)
CREATE TABLE thread_tags (
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (thread_id, tag_id)
);

-- Knowledge Verifications
CREATE TABLE knowledge_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  verified_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 10,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, thread_id)
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge Base Articles
CREATE TABLE knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. INDEXES
-- ============================================

CREATE INDEX idx_profiles_department ON profiles(department_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_threads_department ON threads(department_id);
CREATE INDEX idx_threads_author ON threads(author_id);
CREATE INDEX idx_threads_created ON threads(created_at DESC);
CREATE INDEX idx_threads_skill_level ON threads(skill_level);
CREATE INDEX idx_posts_thread ON posts(thread_id);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_parent ON posts(parent_id);
CREATE INDEX idx_reactions_post ON reactions(post_id);
CREATE INDEX idx_reactions_thread ON reactions(thread_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_knowledge_verifications_user ON knowledge_verifications(user_id);

-- ============================================
-- 3. DATABASE FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers: auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_threads_updated_at
  BEFORE UPDATE ON threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_knowledge_base_articles_updated_at
  BEFORE UPDATE ON knowledge_base_articles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Function: Add knowledge score when solution is marked
CREATE OR REPLACE FUNCTION public.on_solution_marked()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_solution = true AND OLD.is_solution = false THEN
    UPDATE profiles SET knowledge_score = knowledge_score + 5 WHERE id = NEW.author_id;
  ELSIF NEW.is_solution = false AND OLD.is_solution = true THEN
    UPDATE profiles SET knowledge_score = GREATEST(0, knowledge_score - 5) WHERE id = NEW.author_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_post_solution_changed
  AFTER UPDATE OF is_solution ON posts
  FOR EACH ROW
  EXECUTE FUNCTION public.on_solution_marked();

-- Function: Add knowledge score when mastery is verified
CREATE OR REPLACE FUNCTION public.on_mastery_verified()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET knowledge_score = knowledge_score + NEW.score WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_knowledge_verification_created
  AFTER INSERT ON knowledge_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.on_mastery_verified();

-- Function: Auto-unmute users when mute expires
CREATE OR REPLACE FUNCTION public.check_and_unmute_users()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET is_muted = false, muted_until = NULL, mute_reason = NULL
  WHERE is_muted = true AND muted_until IS NOT NULL AND muted_until <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Pause a user
CREATE OR REPLACE FUNCTION public.pause_user(
  target_user_id UUID,
  duration_hours INTEGER,
  reason TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET
    is_muted = true,
    muted_until = CASE
      WHEN duration_hours = 0 THEN NULL
      ELSE now() + (duration_hours || ' hours')::INTERVAL
    END,
    mute_reason = reason
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Unpause a user
CREATE OR REPLACE FUNCTION public.unpause_user(target_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET is_muted = false, muted_until = NULL, mute_reason = NULL
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(target_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM notifications
  WHERE user_id = target_user_id AND is_read = false;
  RETURN count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;

-- PROFILES policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Instructors can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
  );

-- DEPARTMENTS policies
CREATE POLICY "Authenticated users can view departments"
  ON departments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- THREADS policies
CREATE POLICY "Users can view threads in their department"
  ON threads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (
        role IN ('instructor', 'admin')
        OR department_id = threads.department_id
      )
    )
  );

CREATE POLICY "Authenticated users can create threads"
  ON threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own threads"
  ON threads FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Instructors can update any thread"
  ON threads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
  );

-- POSTS policies
CREATE POLICY "Users can view posts in threads they can access"
  ON posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM threads t
      JOIN profiles p ON p.id = auth.uid()
      WHERE t.id = posts.thread_id
      AND (
        p.role IN ('instructor', 'admin')
        OR t.department_id = p.department_id
      )
    )
  );

CREATE POLICY "Users can create posts if not muted"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_muted = true
      AND (muted_until IS NULL OR muted_until > now())
    )
  );

CREATE POLICY "Authors can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- REACTIONS policies
CREATE POLICY "Users can view reactions"
  ON reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add reactions if not muted"
  ON reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_muted = true
      AND (muted_until IS NULL OR muted_until > now())
    )
  );

CREATE POLICY "Users can remove own reactions"
  ON reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- TAGS policies
CREATE POLICY "Authenticated users can view tags"
  ON tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Instructors can manage tags"
  ON tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
  );

-- THREAD_TAGS policies
CREATE POLICY "Authenticated users can view thread tags"
  ON thread_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Thread authors can manage their thread tags"
  ON thread_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM threads WHERE id = thread_id AND author_id = auth.uid()
    )
  );

-- KNOWLEDGE_VERIFICATIONS policies
CREATE POLICY "Users can view verifications in their department"
  ON knowledge_verifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Instructors can create verifications"
  ON knowledge_verifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
    AND verified_by = auth.uid()
  );

-- NOTIFICATIONS policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- KNOWLEDGE_BASE_ARTICLES policies
CREATE POLICY "Authenticated users can view published articles"
  ON knowledge_base_articles FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE POLICY "Instructors can manage all articles"
  ON knowledge_base_articles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('instructor', 'admin')
    )
  );

-- ============================================
-- 5. ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE threads;

-- ============================================
-- 6. SEED DATA
-- ============================================

INSERT INTO departments (name, slug, description, icon) VALUES
  ('Engineering', 'engineering', 'Software development, coding practices, and technical discussions', '⚙️'),
  ('Marketing', 'marketing', 'Marketing strategies, campaigns, and brand management', '📣'),
  ('Logistics', 'logistics', 'Supply chain, operations, and logistics coordination', '📦'),
  ('Design', 'design', 'UI/UX design, graphics, and creative processes', '🎨'),
  ('Human Resources', 'hr', 'People management, policies, and workplace culture', '👥'),
  ('Finance', 'finance', 'Financial planning, accounting, and budgeting', '💰'),
  ('Operations', 'operations', 'Day-to-day operations and process improvement', '🏭');

INSERT INTO tags (name, color) VALUES
  ('Beginner Friendly', '#22c55e'),
  ('Advanced Topic', '#ef4444'),
  ('Discussion', '#3b82f6'),
  ('Tutorial', '#8b5cf6'),
  ('Q&A', '#f59e0b'),
  ('Announcement', '#ec4899');

-- ============================================================
-- تعليمات الحج — Complete Database Schema
-- ============================================================
-- Safe to run on FRESH or EXISTING databases.
-- Uses "IF NOT EXISTS" / DO $$ blocks so nothing breaks.
-- Run this in Supabase SQL Editor (or psql).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. PROFILES (extends Supabase auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username    TEXT UNIQUE,
    full_name   TEXT,
    role        TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Add columns that might be missing on older DBs
DO $$ BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username   TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name  TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role       TEXT DEFAULT 'user';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    )
    ON CONFLICT (id) DO UPDATE SET
        username  = COALESCE(EXCLUDED.username,  public.profiles.username),
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role      = COALESCE(EXCLUDED.role,      public.profiles.role);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ────────────────────────────────────────────────────────────
-- 2. PAGES (top-level content sections)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
    ALTER TABLE public.pages ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ────────────────────────────────────────────────────────────
-- 3. MENUS (sub-sections within a page)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.menus (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id     UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
    ALTER TABLE public.menus ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ────────────────────────────────────────────────────────────
-- 4. OPTIONS (lessons / content items within a menu)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.options (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id     UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    content     TEXT DEFAULT '',
    video_url   TEXT DEFAULT '',
    file_url    TEXT DEFAULT '',
    order_index INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Add file_url if it doesn't exist (required for PDF/image uploads)
DO $$ BEGIN
    ALTER TABLE public.options ADD COLUMN IF NOT EXISTS file_url    TEXT DEFAULT '';
    ALTER TABLE public.options ADD COLUMN IF NOT EXISTS video_url   TEXT DEFAULT '';
    ALTER TABLE public.options ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ────────────────────────────────────────────────────────────
-- 5. QURAN_PARTS (30 Juz for khatma tracking)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quran_parts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_number INTEGER NOT NULL UNIQUE,
    selected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    selected_at TIMESTAMPTZ
);

DO $$ BEGIN
    ALTER TABLE public.quran_parts ADD COLUMN IF NOT EXISTS selected_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Seed 30 parts if table is empty
INSERT INTO public.quran_parts (part_number)
SELECT generate_series(1, 30)
WHERE NOT EXISTS (SELECT 1 FROM public.quran_parts LIMIT 1);


-- ────────────────────────────────────────────────────────────
-- 6. USER_PROGRESS (tracks lesson completion per user)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_progress (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    option_id    UUID NOT NULL REFERENCES public.options(id) ON DELETE CASCADE,
    completed    BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, option_id)
);

DO $$ BEGIN
    ALTER TABLE public.user_progress ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ────────────────────────────────────────────────────────────
-- 7. NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message    TEXT NOT NULL,
    is_read    BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 8. APP_SETTINGS (key-value store for khatma counter, etc.)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT
);

-- Seed khatma counter if not set
INSERT INTO public.app_settings (key, value)
VALUES ('khatma_count', '0')
ON CONFLICT (key) DO NOTHING;


-- ────────────────────────────────────────────────────────────
-- 9. RPC: Delete user (admin function)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_user_by_id(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Delete profile first (cascade will clean up related data)
    DELETE FROM public.profiles WHERE id = target_user_id;
    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- 10. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_parts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings   ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ── PROFILES ──
DROP POLICY IF EXISTS "Users can view all profiles"    ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile"  ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles"     ON public.profiles;

CREATE POLICY "Users can view all profiles"   ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete profiles"    ON public.profiles FOR DELETE USING (public.is_admin());

-- ── PAGES ──
DROP POLICY IF EXISTS "Anyone can read pages"  ON public.pages;
DROP POLICY IF EXISTS "Admins can manage pages" ON public.pages;

CREATE POLICY "Anyone can read pages"   ON public.pages FOR SELECT USING (true);
CREATE POLICY "Admins can manage pages" ON public.pages FOR ALL    USING (public.is_admin());

-- ── MENUS ──
DROP POLICY IF EXISTS "Anyone can read menus"  ON public.menus;
DROP POLICY IF EXISTS "Admins can manage menus" ON public.menus;

CREATE POLICY "Anyone can read menus"   ON public.menus FOR SELECT USING (true);
CREATE POLICY "Admins can manage menus" ON public.menus FOR ALL    USING (public.is_admin());

-- ── OPTIONS ──
DROP POLICY IF EXISTS "Anyone can read options"  ON public.options;
DROP POLICY IF EXISTS "Admins can manage options" ON public.options;

CREATE POLICY "Anyone can read options"   ON public.options FOR SELECT USING (true);
CREATE POLICY "Admins can manage options" ON public.options FOR ALL    USING (public.is_admin());

-- ── QURAN_PARTS ──
DROP POLICY IF EXISTS "Anyone can read quran_parts"       ON public.quran_parts;
DROP POLICY IF EXISTS "Authenticated can update quran_parts" ON public.quran_parts;

CREATE POLICY "Anyone can read quran_parts"          ON public.quran_parts FOR SELECT USING (true);
CREATE POLICY "Authenticated can update quran_parts" ON public.quran_parts FOR UPDATE USING (auth.role() = 'authenticated');

-- ── USER_PROGRESS ──
DROP POLICY IF EXISTS "Users can view own progress"    ON public.user_progress;
DROP POLICY IF EXISTS "Users can manage own progress"  ON public.user_progress;

CREATE POLICY "Users can view own progress"   ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own progress" ON public.user_progress FOR ALL    USING (auth.uid() = user_id);

-- ── NOTIFICATIONS ──
DROP POLICY IF EXISTS "Users can view own notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications"  ON public.notifications;
DROP POLICY IF EXISTS "Admins can manage notifications"     ON public.notifications;

CREATE POLICY "Users can view own notifications"   ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage notifications"    ON public.notifications FOR ALL    USING (public.is_admin());

-- ── APP_SETTINGS ──
DROP POLICY IF EXISTS "Anyone can read app_settings"   ON public.app_settings;
DROP POLICY IF EXISTS "Admins can manage app_settings"  ON public.app_settings;

CREATE POLICY "Anyone can read app_settings"   ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage app_settings" ON public.app_settings FOR ALL    USING (public.is_admin());


-- ────────────────────────────────────────────────────────────
-- 11. REALTIME (enable for tables that need live updates)
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quran_parts;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ────────────────────────────────────────────────────────────
-- 12. STORAGE BUCKET (for PDF / image uploads)
-- ────────────────────────────────────────────────────────────
-- NOTE: Run this ONLY if the bucket doesn't exist yet.
-- Supabase SQL Editor does support storage.buckets, but
-- if you get an error, create the bucket manually in the
-- Supabase Dashboard → Storage → New Bucket → "lesson-files" (public).

INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-files', 'lesson-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: anyone authenticated can upload
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'lesson-files' AND auth.role() = 'authenticated');

-- Storage policy: public read
DROP POLICY IF EXISTS "Public read for lesson-files" ON storage.objects;
CREATE POLICY "Public read for lesson-files"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'lesson-files');

-- Storage policy: admins can delete
DROP POLICY IF EXISTS "Admins can delete lesson files" ON storage.objects;
CREATE POLICY "Admins can delete lesson files"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'lesson-files' AND public.is_admin());


-- ============================================================
-- DONE! Your database is now fully set up for تعليمات الحج.
-- ============================================================

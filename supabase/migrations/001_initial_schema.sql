-- =============================================
-- 採用動画管理ツール - 初期スキーマ
-- =============================================

-- 企業テーブル
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 管理者ユーザーテーブル（Supabase Authと連携）
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('master', 'company')),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 学生テーブル
CREATE TABLE IF NOT EXISTS public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ats_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  university TEXT,
  department TEXT,
  token TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_expires_at TIMESTAMPTZ DEFAULT (now() + interval '365 days'),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, company_id)
);

-- 動画テーブル
CREATE TABLE IF NOT EXISTS public.videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  subcategory TEXT,
  duration_sec INTEGER,
  video_url TEXT,
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 視聴イベントテーブル
CREATE TABLE IF NOT EXISTS public.watch_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('play', 'pause', 'seek', 'ended', 'heartbeat')),
  position_sec REAL,
  session_id TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 監査ログテーブル
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 学生メモテーブル
CREATE TABLE IF NOT EXISTS public.student_memos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, author_email)
);

-- =============================================
-- インデックス
-- =============================================
CREATE INDEX IF NOT EXISTS idx_students_company ON public.students(company_id);
CREATE INDEX IF NOT EXISTS idx_students_token ON public.students(token);
CREATE INDEX IF NOT EXISTS idx_students_email_company ON public.students(email, company_id);
CREATE INDEX IF NOT EXISTS idx_videos_company ON public.videos(company_id);
CREATE INDEX IF NOT EXISTS idx_watch_events_student ON public.watch_events(student_id);
CREATE INDEX IF NOT EXISTS idx_watch_events_video ON public.watch_events(video_id);
CREATE INDEX IF NOT EXISTS idx_watch_events_company ON public.watch_events(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON public.audit_logs(company_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_memos ENABLE ROW LEVEL SECURITY;

-- 認証ユーザー: 全操作許可（アプリレベルでアクセス制御）
CREATE POLICY "auth_all_companies" ON public.companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_admin_users" ON public.admin_users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_students" ON public.students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_videos" ON public.videos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_watch_events" ON public.watch_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_audit_logs" ON public.audit_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_student_memos" ON public.student_memos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 匿名ユーザー（学生ポータル）: 読み取り + 視聴イベント書き込み
CREATE POLICY "anon_read_students" ON public.students FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_videos" ON public.videos FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_watch_events" ON public.watch_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_read_admin_users" ON public.admin_users FOR SELECT TO anon USING (true);

-- =============================================
-- Realtime 有効化
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_events;

import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        '【重要】Supabaseの環境変数が設定されていません。\n' +
        'プロジェクト直下に .env ファイルを作成し、VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。\n' +
        '詳細は .env.example を参照してください。'
    )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─────────────────────────────────────────────
// データベース型定義
// ─────────────────────────────────────────────

export interface Company {
    id: string
    name: string
    created_at: string
}

export interface AdminUser {
    id: string
    email: string
    role: 'master' | 'company'
    company_id: string | null
    company?: Company
    created_at: string
}

export interface Student {
    id: string
    ats_id: string | null
    name: string
    email: string
    phone: string | null
    university: string | null
    department: string | null
    token: string
    token_expires_at: string
    company_id: string | null
    created_at: string
}

export interface Video {
    id: string
    title: string
    description: string | null
    category: string | null
    subcategory: string | null
    duration_sec: number | null
    video_url: string | null
    thumbnail_url: string | null
    is_published: boolean
    is_pinned: boolean
    company_id: string | null
    created_at: string
}

export type WatchEventType = 'play' | 'pause' | 'seek' | 'ended' | 'heartbeat'

export interface WatchEvent {
    id: string
    student_id: string
    video_id: string
    event_type: WatchEventType
    position_sec: number | null
    session_id: string | null
    company_id: string | null
    created_at: string
}

export interface AuditLog {
    id: string
    actor_email: string
    action: string
    target_type: string
    target_id: string | null
    company_id: string | null
    details: Record<string, unknown>
    created_at: string
}

export interface StudentMemo {
    id: string
    student_id: string
    company_id: string | null
    author_email: string
    content: string
    updated_at: string
    created_at: string
}

import { useState, useEffect } from "react";
import { Overview } from "./components/Overview";
import { VideoAnalytics } from "./components/VideoAnalytics";
import { ContentManagement } from "./components/ContentManagement";
import { StudentManagement } from "./components/StudentManagement";
import { StudentPortal } from "./components/StudentPortal";
import { Manual } from "./components/Manual";
import { Login } from "./components/Login";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { BarChart3, Home, TrendingUp, FolderOpen, Users, Book, LogOut } from "lucide-react";
import { Toaster } from "sonner";

type View = "overview" | "contents" | "content" | "students" | "manual";

const VALID_VIEWS: View[] = ["overview", "contents", "content", "students", "manual"];

function getInitialView(): View {
  const hash = window.location.hash.replace("#", "") as View;
  return VALID_VIEWS.includes(hash) ? hash : "overview";
}

function Dashboard({ companyId, companyName }: { companyId: string; companyName: string }) {
  const { adminUser, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>(getInitialView);

  function navigate(view: View) {
    setCurrentView(view);
    window.location.hash = view;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 左サイドバー */}
      <aside className="w-64 bg-white border-r min-h-screen fixed left-0 top-0">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-[#0079B3]" />
            <div className="flex-1 text-left min-w-0">
              <h1 className="font-bold text-[#0079B3] truncate">採用動画管理</h1>
              <p className="text-xs text-gray-500 truncate">{companyName}</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          <button
            onClick={() => navigate("overview")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === "overview"
              ? "bg-[#5CA7D1] text-white font-medium"
              : "text-gray-700 hover:bg-gray-50"
              }`}
          >
            <Home className="h-5 w-5" />
            <span>全体概要</span>
          </button>

          <button
            onClick={() => navigate("contents")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === "contents"
              ? "bg-[#5CA7D1] text-white font-medium"
              : "text-gray-700 hover:bg-gray-50"
              }`}
          >
            <TrendingUp className="h-5 w-5" />
            <span>動画別分析</span>
          </button>

          <button
            onClick={() => navigate("content")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === "content"
              ? "bg-[#5CA7D1] text-white font-medium"
              : "text-gray-700 hover:bg-gray-50"
              }`}
          >
            <FolderOpen className="h-5 w-5" />
            <span>動画管理</span>
          </button>

          <button
            onClick={() => navigate("students")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === "students"
              ? "bg-[#5CA7D1] text-white font-medium"
              : "text-gray-700 hover:bg-gray-50"
              }`}
          >
            <Users className="h-5 w-5" />
            <span>学生管理</span>
          </button>

          <button
            onClick={() => navigate("manual")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${currentView === "manual"
              ? "bg-[#5CA7D1] text-white font-medium"
              : "text-gray-700 hover:bg-gray-50"
              }`}
          >
            <Book className="h-5 w-5" />
            <span>マニュアル</span>
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="text-xs text-gray-400 truncate mb-2">{adminUser?.email}</div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64">
        <div className="container mx-auto px-8 py-8">
          {currentView === "overview" && <Overview companyId={companyId} />}
          {currentView === "contents" && <VideoAnalytics companyId={companyId} />}
          {currentView === "content" && <ContentManagement companyId={companyId} />}
          {currentView === "students" && <StudentManagement companyId={companyId} />}
          {currentView === "manual" && <Manual />}
        </div>

        <footer className="bg-white border-t mt-12">
          <div className="container mx-auto px-8 py-4 text-center text-sm text-gray-500">
            &copy; 2026 採用動画管理ツール
          </div>
        </footer>
      </main>
    </div>
  );
}

function CompanyApp() {
  const { session, adminUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!adminUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-500 space-y-4">
          <p>このアカウントは管理者として登録されていません。</p>
          <p className="text-sm text-gray-400">{session.user.email}</p>
          <button
            onClick={() => { void import('../../lib/supabase').then(m => m.supabase.auth.signOut()) }}
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>
    );
  }

  if (adminUser.company_id) {
    return (
      <Dashboard
        companyId={adminUser.company_id}
        companyName={adminUser.company?.name || ""}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center text-gray-500">
        <p>アカウントに企業が紐付けられていません。管理者にお問い合わせください。</p>
      </div>
    </div>
  );
}

export default function App() {
  const pathname = window.location.pathname;

  // /watch → 学生ポータル（認証不要）
  if (pathname === "/watch") {
    return (
      <ErrorBoundary fallbackMessage="ポータルの読み込みに失敗しました">
        <StudentPortal />
        <Toaster richColors position="top-right" />
      </ErrorBoundary>
    );
  }

  // それ以外 → 管理者ダッシュボード
  return (
    <ErrorBoundary fallbackMessage="管理画面の読み込みに失敗しました">
      <Toaster richColors position="top-right" />
      <AuthProvider>
        <CompanyApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}

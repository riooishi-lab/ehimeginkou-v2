import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { AddStudentCSVDialog } from "./AddStudentCSVDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Upload, Download, Search, Trash2, Copy, Link, Clock, Play, Calendar, Loader2, ChevronUp, ChevronDown, ChevronsUpDown, ListFilter, StickyNote, Mail, Send, CheckCircle2, XCircle, Users, Eye, EyeOff } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { supabase, supabaseUrl } from "../../lib/supabase";
import type { Student } from "../../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

// 監査ログ記録ヘルパー
async function writeAuditLog(
  actorEmail: string,
  action: string,
  targetType: string,
  targetId: string | null,
  companyId: string,
  details: Record<string, unknown> = {}
) {
  await supabase.from("audit_logs").insert({
    actor_email: actorEmail,
    action,
    target_type: targetType,
    target_id: targetId,
    company_id: companyId,
    details,
  });
}

interface StudentWithStats extends Student {
  watch_seconds: number;
  view_count: number;
}

interface WatchSessionLog {
  session_id: string;
  video_id: string;
  title: string;
  started_at: string;
  watch_seconds: number;
}

type SortColumn = "name" | "university" | "department" | "watch_seconds" | "view_count";
type SortDir = "asc" | "desc";

// フィルタードロップダウンコンポーネント
function FilterDropdown({
  values,
  selected,
  onChange,
}: {
  values: string[];
  selected: string[] | null; // null = すべて選択
  onChange: (selected: string[] | null) => void;
}) {
  const allSelected = selected === null || selected.length === values.length;
  const checked = (v: string) => selected === null || selected.includes(v);

  const toggle = (v: string) => {
    if (selected === null) {
      // 全選択 → 1つだけOFFにする
      onChange(values.filter((x) => x !== v));
    } else {
      const next = checked(v) ? selected.filter((x) => x !== v) : [...selected, v];
      onChange(next.length === values.length ? null : next);
    }
  };

  const toggleAll = () => {
    onChange(allSelected ? [] : null);
  };

  return (
    <div className="py-1">
      <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm border-b">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="rounded"
        />
        <span className="font-medium">すべて選択</span>
      </label>
      <div className="max-h-48 overflow-y-auto">
        {values.map((v) => (
          <label key={v} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={checked(v)}
              onChange={() => toggle(v)}
              className="rounded"
            />
            <span>{v || "—"}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ソート＋フィルターヘッダーセル
function SortFilterHead({
  label,
  col,
  sortConfig,
  onSort,
  filterValues,
  activeFilter,
  onFilter,
}: {
  label: string;
  col: SortColumn;
  sortConfig: { col: SortColumn; dir: SortDir } | null;
  onSort: (col: SortColumn) => void;
  filterValues?: string[];
  activeFilter?: string[] | null;
  onFilter?: (v: string[] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isFiltered = activeFilter !== null && activeFilter !== undefined;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const SortIcon = () => {
    if (sortConfig?.col !== col) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
    return sortConfig.dir === "asc"
      ? <ChevronUp className="h-3 w-3 text-blue-600" />
      : <ChevronDown className="h-3 w-3 text-blue-600" />;
  };

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onSort(col)}
          className="flex items-center gap-1 hover:text-blue-600 font-medium transition-colors"
        >
          {label}
          <SortIcon />
        </button>
        {filterValues && onFilter && (
          <button
            onClick={() => setOpen((v) => !v)}
            className={`p-0.5 rounded hover:bg-gray-200 transition-colors ${isFiltered ? "text-blue-600" : "text-gray-400"}`}
          >
            <ListFilter className="h-3 w-3" />
          </button>
        )}
      </div>
      {open && filterValues && onFilter && (
        <div className="absolute top-full left-0 z-50 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
          <FilterDropdown
            values={filterValues}
            selected={activeFilter ?? null}
            onChange={(v) => { onFilter(v); setOpen(false); }}
          />
        </div>
      )}
    </div>
  );
}

// ソートのみのヘッダー
function SortOnlyHead({
  label,
  col,
  sortConfig,
  onSort,
}: {
  label: string;
  col: SortColumn;
  sortConfig: { col: SortColumn; dir: SortDir } | null;
  onSort: (col: SortColumn) => void;
}) {
  const SortIcon = () => {
    if (sortConfig?.col !== col) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
    return sortConfig.dir === "asc"
      ? <ChevronUp className="h-3 w-3 text-blue-600" />
      : <ChevronDown className="h-3 w-3 text-blue-600" />;
  };
  return (
    <button
      onClick={() => onSort(col)}
      className="flex items-center gap-1 hover:text-blue-600 font-medium transition-colors"
    >
      {label}
      <SortIcon />
    </button>
  );
}

export function StudentManagement({ companyId }: { companyId: string }) {
  const { adminUser } = useAuth();
  const actorEmail = adminUser?.email || "unknown";
  const [students, setStudents] = useState<StudentWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentWithStats | null>(null);
  const [watchHistory, setWatchHistory] = useState<WatchSessionLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [memoStudent, setMemoStudent] = useState<StudentWithStats | null>(null);
  const [memoText, setMemoText] = useState("");

  // ソート
  const [sortConfig, setSortConfig] = useState<{ col: SortColumn; dir: SortDir } | null>(null);

  // カラムフィルター（null = 全選択）
  const [colFilters, setColFilters] = useState<Record<string, string[] | null>>({});

  const fetchStudents = useCallback(async () => {
    setLoading(true);

    const { data: studentData, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false })
      .eq("company_id", companyId);

    if (error) {
      toast.error(`データ取得エラー: ${error.message}`);
      setLoading(false);
      return;
    }

    const { data: statsData } = await supabase
      .from("watch_events")
      .select("student_id, event_type, session_id")
      .eq("company_id", companyId)
      .in("event_type", ["heartbeat"]);

    const statsMap: Record<string, { watch_seconds: number; view_count: number }> = {};
    (statsData || []).forEach((row: { student_id: string; event_type: string; session_id: string }) => {
      if (!statsMap[row.student_id]) statsMap[row.student_id] = { watch_seconds: 0, view_count: 0 };
      statsMap[row.student_id].watch_seconds += 30;
    });

    const { data: sessionData } = await supabase
      .from("watch_events")
      .select("student_id, session_id")
      .eq("company_id", companyId)
      .eq("event_type", "play");

    (sessionData || []).forEach((row: { student_id: string; session_id: string }) => {
      if (!statsMap[row.student_id]) statsMap[row.student_id] = { watch_seconds: 0, view_count: 0 };
      statsMap[row.student_id].view_count += 1;
    });

    const enriched: StudentWithStats[] = (studentData || []).map((s: Student) => ({
      ...s,
      watch_seconds: statsMap[s.id]?.watch_seconds || 0,
      view_count: statsMap[s.id]?.view_count || 0,
    }));

    setStudents(enriched);
    setLoading(false);
  }, [companyId]);

  const fetchWatchHistory = async (student: StudentWithStats) => {
    setSelectedStudent(student);
    setHistoryLoading(true);
    setWatchHistory([]);

    const { data: events, error } = await supabase
      .from("watch_events")
      .select("*, videos(title)")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error(`履歴取得エラー: ${error.message}`);
      setHistoryLoading(false);
      return;
    }

    const sessionMap: Record<string, WatchSessionLog> = {};
    (events || []).forEach((event: any) => {
      const sid = event.session_id || event.id;
      if (!sessionMap[sid]) {
        sessionMap[sid] = {
          session_id: sid,
          video_id: event.video_id,
          title: event.videos?.title || "不明な動画",
          started_at: event.created_at,
          watch_seconds: 0,
        };
      }
      if (event.event_type === "play") {
        if (new Date(event.created_at) < new Date(sessionMap[sid].started_at)) {
          sessionMap[sid].started_at = event.created_at;
        }
      }
      if (event.event_type === "heartbeat") sessionMap[sid].watch_seconds += 30;
    });

    const logs = Object.values(sessionMap).sort(
      (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
    setWatchHistory(logs);
    setHistoryLoading(false);
  };

  useEffect(() => {
    fetchStudents();
    const channel = supabase
      .channel("student-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => fetchStudents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStudents]);

  // ユニーク値を取得
  const uniqueValues = (key: keyof StudentWithStats) =>
    Array.from(new Set(students.map((s) => String(s[key] ?? "")))).sort((a, b) =>
      a.localeCompare(b, "ja")
    );

  // フィルタリング
  const filteredStudents = students.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.university || "").toLowerCase().includes(q) ||
      (s.ats_id || "").toLowerCase().includes(q);

    const matchesColFilter = Object.entries(colFilters).every(([col, vals]) => {
      if (vals === null) return true;
      const val = String(s[col as keyof StudentWithStats] ?? "");
      return vals.includes(val);
    });

    return matchesSearch && matchesColFilter;
  });

  // ソート
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (!sortConfig) return 0;
    const { col, dir } = sortConfig;
    const mult = dir === "asc" ? 1 : -1;
    if (col === "watch_seconds" || col === "view_count") {
      return (a[col] - b[col]) * mult;
    }
    return ((a[col] || "") as string).localeCompare((b[col] || "") as string, "ja") * mult;
  });

  const toggleSort = (col: SortColumn) => {
    setSortConfig((prev) =>
      prev?.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: "asc" }
    );
  };

  const setColFilter = (col: string, vals: string[] | null) => {
    setColFilters((prev) => ({ ...prev, [col]: vals }));
  };

  const downloadCSV = () => {
    const headers = ["名前", "ATS ID", "メールアドレス", "電話番号", "大学", "学部", "総視聴時間(秒)", "視聴回数", "登録日"];
    const rows = sortedStudents.map((s) => [
      s.name,
      s.ats_id || "",
      s.email,
      s.phone || "",
      s.university || "",
      s.department || "",
      s.watch_seconds,
      s.view_count,
      new Date(s.created_at).toLocaleDateString("ja-JP"),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getWatchUrl = (token: string) => `${window.location.origin}/watch?token=${token}`;

  const copyUrl = (token: string) => {
    navigator.clipboard.writeText(getWatchUrl(token));
    toast.success("URLをコピーしました");
  };

  const deleteStudent = async (id: string) => {
    const student = students.find((s) => s.id === id);
    if (!confirm(`${student?.name || "この学生"} のデータを完全に削除しますか？\n視聴履歴・メモも全て削除されます。この操作は取り消せません。`)) {
      return;
    }
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) {
      toast.error(`削除エラー: ${error.message}`);
    } else {
      toast.success("学生データを完全に削除しました");
      setStudents((prev) => prev.filter((s) => s.id !== id));
      writeAuditLog(actorEmail, "student_delete", "student", id, companyId, {
        student_name: student?.name,
        student_email: student?.email,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ja-JP", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const [memoLoading, setMemoLoading] = useState(false);

  const openMemo = async (student: StudentWithStats) => {
    setMemoStudent(student);
    setMemoLoading(true);
    setMemoText("");
    // DBからメモを取得
    const { data } = await supabase
      .from("student_memos")
      .select("content")
      .eq("student_id", student.id)
      .eq("author_email", actorEmail)
      .maybeSingle();
    setMemoText(data?.content || "");
    setMemoLoading(false);
  };

  const saveMemo = async () => {
    if (!memoStudent) return;
    if (memoText.trim()) {
      await supabase
        .from("student_memos")
        .upsert({
          student_id: memoStudent.id,
          company_id: companyId,
          author_email: actorEmail,
          content: memoText.trim(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "student_id,author_email" });
      toast.success("メモを保存しました");
    } else {
      await supabase
        .from("student_memos")
        .delete()
        .eq("student_id", memoStudent.id)
        .eq("author_email", actorEmail);
    }
    setMemoStudent(null);
  };

  // 一斉送信
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("採用動画のご案内");
  const [emailBody, setEmailBody] = useState(
    `{name} さん\n\nこの度は弊社の採用にご関心をお持ちいただきありがとうございます。\n\n採用に関する動画をご用意いたしました。下記のURLよりご視聴ください。\n\n{url}\n\nご不明な点がございましたら、お気軽にご連絡ください。\n\n採用担当`
  );
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);

  const sendBulkEmail = async () => {
    setSending(true);
    setSendResult(null);
    try {
      // セッショントークンを使用（anon key ではなく認証済みユーザーのトークン）
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        toast.error("ログインセッションが切れています。再ログインしてください。");
        setSending(false);
        return;
      }

      const payload = {
        students: sortedStudents.map((s) => ({ name: s.name, email: s.email, token: s.token })),
        subject: emailSubject,
        bodyTemplate: emailBody,
        baseUrl: window.location.origin,
      };
      const response = await fetch(`${supabaseUrl}/functions/v1/send-bulk-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        toast.error("サーバーからの応答が不正です");
        return;
      }

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "メール送信に失敗しました");
        return;
      }
      setSendResult(result);
      if (result.sent > 0) toast.success(`${result.sent}件のメールを送信しました`);
      if (result.failed > 0) toast.error(`${result.failed}件の送信に失敗しました`);
      writeAuditLog(actorEmail, "bulk_email", "email", null, companyId, {
        recipient_count: sortedStudents.length,
        sent: result.sent,
        failed: result.failed,
        subject: emailSubject,
      });
    } catch {
      toast.error("通信エラーが発生しました");
    } finally {
      setSending(false);
    }
  };

  // アクティブフィルター数
  const activeFilterCount = Object.values(colFilters).filter((v) => v !== null).length;

  // 統計
  const viewedCount = students.filter((s) => s.view_count > 0).length;
  const notViewedCount = students.length - viewedCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">学生管理</h2>
          <p className="text-gray-500 mt-1">採用候補者の管理・分析</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={downloadCSV}>
            <Download className="h-4 w-4" />
            CSVダウンロード
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => { setEmailDialogOpen(true); setSendResult(null); }}
          >
            <Mail className="h-4 w-4" />
            視聴リンクを一斉送信
          </Button>
          <AddStudentCSVDialog onSuccess={fetchStudents} companyId={companyId}>
            <Button className="gap-2">
              <Upload className="h-4 w-4" />
              CSVで学生を追加
            </Button>
          </AddStudentCSVDialog>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              総学生数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}名</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              視聴済み
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{viewedCount}名</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
              <EyeOff className="h-4 w-4" />
              未視聴
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">{notViewedCount}名</div>
          </CardContent>
        </Card>
      </div>

      {/* 学生リスト */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>学生一覧</CardTitle>
              <CardDescription>
                {sortedStudents.length}名の学生を表示中
                {activeFilterCount > 0 && (
                  <span className="ml-2 text-blue-600">
                    （{activeFilterCount}列フィルター中）
                    <button
                      onClick={() => setColFilters({})}
                      className="ml-1 underline hover:no-underline"
                    >
                      クリア
                    </button>
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-80">
              <Search className="h-4 w-4 text-gray-500" />
              <Input
                placeholder="名前、メール、大学、ATS IDで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-gray-400">
              <div className="animate-pulse">データを読み込み中...</div>
            </div>
          ) : sortedStudents.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <Upload className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">学生データがありません</p>
              <p className="text-sm mt-1">CSVで学生を追加してください</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortFilterHead
                        label="名前"
                        col="name"
                        sortConfig={sortConfig}
                        onSort={toggleSort}
                        filterValues={uniqueValues("name")}
                        activeFilter={colFilters["name"] ?? null}
                        onFilter={(v) => setColFilter("name", v)}
                      />
                    </TableHead>
                    <TableHead>ATS ID</TableHead>
                    <TableHead>メールアドレス</TableHead>
                    <TableHead>電話番号</TableHead>
                    <TableHead>
                      <SortFilterHead
                        label="大学"
                        col="university"
                        sortConfig={sortConfig}
                        onSort={toggleSort}
                        filterValues={uniqueValues("university")}
                        activeFilter={colFilters["university"] ?? null}
                        onFilter={(v) => setColFilter("university", v)}
                      />
                    </TableHead>
                    <TableHead>
                      <SortFilterHead
                        label="学部"
                        col="department"
                        sortConfig={sortConfig}
                        onSort={toggleSort}
                        filterValues={uniqueValues("department")}
                        activeFilter={colFilters["department"] ?? null}
                        onFilter={(v) => setColFilter("department", v)}
                      />
                    </TableHead>
                    <TableHead>
                      <SortOnlyHead label="総視聴時間" col="watch_seconds" sortConfig={sortConfig} onSort={toggleSort} />
                    </TableHead>
                    <TableHead>
                      <SortOnlyHead label="視聴回数" col="view_count" sortConfig={sortConfig} onSort={toggleSort} />
                    </TableHead>
                    <TableHead>登録日</TableHead>
                    <TableHead>視聴URL</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{student.ats_id || "—"}</TableCell>
                      <TableCell className="text-sm text-gray-600">{student.email}</TableCell>
                      <TableCell className="text-sm text-gray-600">{student.phone || "—"}</TableCell>
                      <TableCell className="text-sm">{student.university || "—"}</TableCell>
                      <TableCell className="text-sm">{student.department || "—"}</TableCell>
                      <TableCell
                        className="text-sm cursor-pointer text-blue-600 hover:underline"
                        onClick={() => fetchWatchHistory(student)}
                        title="クリックで視聴履歴を表示"
                      >
                        {formatTime(student.watch_seconds)}
                      </TableCell>
                      <TableCell
                        className="text-sm cursor-pointer text-blue-600 hover:underline"
                        onClick={() => fetchWatchHistory(student)}
                        title="クリックで視聴履歴を表示"
                      >
                        {student.view_count}回
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                        {new Date(student.created_at).toLocaleDateString("ja-JP", {
                          year: "numeric", month: "2-digit", day: "2-digit"
                        })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-blue-600 hover:text-blue-700"
                          onClick={() => copyUrl(student.token)}
                          title={getWatchUrl(student.token)}
                        >
                          <Link className="h-4 w-4" />
                          <Copy className="h-3 w-3" />
                          コピー
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2"
                            onClick={() => openMemo(student)}
                          >
                            <StickyNote className="h-4 w-4" />
                            メモ
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-red-600 hover:text-red-700"
                            onClick={() => deleteStudent(student.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            削除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 視聴履歴詳細ダイアログ */}
      <Dialog open={selectedStudent !== null} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedStudent?.name} さんの視聴履歴</DialogTitle>
            <DialogDescription>
              {selectedStudent?.email} • {selectedStudent?.university} {selectedStudent?.department}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                <p className="text-sm text-gray-500">視聴履歴を取得中...</p>
              </div>
            ) : watchHistory.length === 0 ? (
              <div className="text-center py-12 text-gray-500 border rounded-lg bg-gray-50">
                <p>視聴履歴はまだありません</p>
              </div>
            ) : (
              <div className="divide-y rounded-lg border overflow-hidden">
                {watchHistory.map((item) => (
                  <div key={item.session_id} className="flex items-center gap-4 px-4 py-3 bg-white hover:bg-gray-50">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 w-36 shrink-0">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(item.started_at)}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 w-28 shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      視聴時間: <span className="font-medium text-gray-800 ml-0.5">{formatTime(item.watch_seconds)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-800 min-w-0">
                      <Play className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* メモダイアログ */}
      <Dialog open={memoStudent !== null} onOpenChange={(open) => !open && setMemoStudent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{memoStudent?.name} さんのメモ</DialogTitle>
            <DialogDescription>
              {memoStudent?.email} • {memoStudent?.university} {memoStudent?.department}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {memoLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <Textarea
                placeholder="メモを入力してください..."
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                rows={6}
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMemoStudent(null)}>キャンセル</Button>
              <Button onClick={saveMemo} disabled={memoLoading}>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 一斉送信ダイアログ */}
      <Dialog open={emailDialogOpen} onOpenChange={(open) => { if (!open) setEmailDialogOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              視聴リンクを一斉送信
            </DialogTitle>
            <DialogDescription>
              現在表示中の <span className="font-semibold text-gray-900">{sortedStudents.length}名</span> にメールを送信します。
              検索で絞り込んでから送信できます。
            </DialogDescription>
          </DialogHeader>

          {sendResult ? (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
                  <div>
                    <div className="text-2xl font-bold text-green-700">{sendResult.sent}件</div>
                    <div className="text-sm text-green-600">送信成功</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <XCircle className="h-8 w-8 text-red-400 shrink-0" />
                  <div>
                    <div className="text-2xl font-bold text-red-600">{sendResult.failed}件</div>
                    <div className="text-sm text-red-500">送信失敗</div>
                  </div>
                </div>
              </div>
              {sendResult.errors.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200 space-y-1">
                  <p className="text-sm font-medium text-red-700">エラー詳細:</p>
                  {sendResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">{e}</p>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSendResult(null)}>再送信設定に戻る</Button>
                <Button onClick={() => setEmailDialogOpen(false)}>閉じる</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">件名</label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="採用動画のご案内"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  本文
                  <span className="ml-2 font-normal text-gray-400 text-xs">
                    変数: <code className="bg-gray-100 px-1 rounded">{"{name}"}</code>=名前　<code className="bg-gray-100 px-1 rounded">{"{url}"}</code>=視聴URL
                  </span>
                </label>
                <Textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              {sortedStudents.length > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg border text-sm">
                  <p className="font-medium text-gray-600 mb-1">プレビュー（{sortedStudents[0].name} さん宛て）</p>
                  <p className="text-xs text-gray-500 whitespace-pre-wrap">
                    {emailBody
                      .replace(/{name}/g, sortedStudents[0].name)
                      .replace(/{url}/g, `${window.location.origin}/watch?token=${sortedStudents[0].token}`)
                    }
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>キャンセル</Button>
                <Button
                  onClick={sendBulkEmail}
                  disabled={sending || sortedStudents.length === 0 || !emailSubject || !emailBody}
                  className="gap-2"
                >
                  {sending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />送信中...</>
                  ) : (
                    <><Send className="h-4 w-4" />{sortedStudents.length}名に送信</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 大学別分布 */}
      <Card>
        <CardHeader>
          <CardTitle>大学別分布</CardTitle>
          <CardDescription>主要大学からの応募状況</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(() => {
              const uniCount: Record<string, number> = {};
              students.forEach((s) => {
                if (s.university) uniCount[s.university] = (uniCount[s.university] || 0) + 1;
              });
              return Object.entries(uniCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([uni, count]) => {
                  const pct = students.length > 0 ? (count / students.length) * 100 : 0;
                  return (
                    <div key={uni} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{uni}</span>
                        <span className="text-sm text-gray-600">{count}名 ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                });
            })()}
            {students.every((s) => !s.university) && (
              <p className="text-sm text-gray-400 text-center py-4">大学データがありません</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

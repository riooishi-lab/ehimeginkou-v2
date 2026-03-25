import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { AddVideoDialog, BRIEFING_CATEGORY } from "./AddVideoDialog";
import { supabase } from "../../lib/supabase";
import type { Video } from "../../lib/supabase";
import {
  Pencil,
  Trash2,
  Plus,
  Video as VideoIcon,
  Eye,
  EyeOff,
  Image as ImageIcon,
  RefreshCw,
  Pin,
  PinOff,
} from "lucide-react";
import { toast } from "sonner";

export function ContentManagement({ companyId }: { companyId: string }) {
  const [videosList, setVideosList] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [refreshingDurations, setRefreshingDurations] = useState(false);

  // ─── YouTube動画の長さを一括更新 ───
  const refreshYouTubeDurations = async () => {
    const ytVideos = videosList.filter((v) => {
      const isYT = v.video_url?.includes("youtube.com") || v.video_url?.includes("youtu.be");
      return isYT && (v.duration_sec == null || v.duration_sec === 300);
    });
    if (ytVideos.length === 0) {
      toast.info("更新が必要なYouTube動画はありません");
      return;
    }
    setRefreshingDurations(true);

    const ensureYTAPI = (): Promise<void> => {
      if ((window as any).YT?.Player) return Promise.resolve();
      return new Promise((resolve) => {
        const prev = (window as any).onYouTubeIframeAPIReady;
        (window as any).onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
        if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
          const tag = document.createElement("script");
          tag.src = "https://www.youtube.com/iframe_api";
          document.head.appendChild(tag);
        }
      });
    };

    const fetchDuration = (ytId: string): Promise<number> =>
      new Promise((resolve) => {
        const divId = `refresh-dur-${ytId}`;
        let div = document.getElementById(divId);
        if (!div) {
          div = document.createElement("div");
          div.id = divId;
          div.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;";
          document.body.appendChild(div);
        }
        new (window as any).YT.Player(divId, {
          videoId: ytId,
          playerVars: { autoplay: 0 },
          events: {
            onReady: (e: any) => {
              const dur = Math.round(e.target.getDuration());
              e.target.destroy();
              document.getElementById(divId)?.remove();
              resolve(dur > 0 ? dur : 0);
            },
          },
        });
      });

    await ensureYTAPI();
    let updated = 0;
    for (const video of ytVideos) {
      const ytId = video.video_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]{11})/)?.[1];
      if (!ytId) continue;
      try {
        const dur = await fetchDuration(ytId);
        if (dur > 0) {
          await supabase.from("videos").update({ duration_sec: dur }).eq("id", video.id);
          updated++;
        }
      } catch { /* ignore individual failures */ }
    }
    setRefreshingDurations(false);
    toast.success(`${updated}本の動画の長さを更新しました`);
    fetchVideos();
  };

  // ─── Fetch ───
  const fetchVideos = useCallback(async () => {
    setVideosLoading(true);
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("created_at", { ascending: false })
      .eq("company_id", companyId);
    if (error) toast.error(`動画取得エラー: ${error.message}`);
    else setVideosList(data || []);
    setVideosLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchVideos();

    const videoChannel = supabase
      .channel("video-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, fetchVideos)
      .subscribe();

    return () => {
      supabase.removeChannel(videoChannel);
    };
  }, [fetchVideos]);

  // ─── ピン留め切り替え ───
  const togglePin = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("videos")
      .update({ is_pinned: !current })
      .eq("id", id);
    if (error) toast.error(`更新エラー: ${error.message}`);
    else {
      toast.success(!current ? "ピン留めしました" : "ピン留めを解除しました");
      fetchVideos();
    }
  };

  // ─── 公開ステータス切り替え ───
  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("videos")
      .update({ is_published: !current })
      .eq("id", id);
    if (error) toast.error(`更新エラー: ${error.message}`);
    else {
      toast.success(!current ? "公開しました" : "下書きに戻しました");
      fetchVideos();
    }
  };

  // ─── 削除 ───
  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`「${label}」を削除しますか？`)) return;
    const { error: weErr } = await supabase.from("watch_events").delete().eq("video_id", id);
    if (weErr) { toast.error(`削除エラー: ${weErr.message}`); return; }
    const { error } = await supabase.from("videos").delete().eq("id", id);
    if (error) toast.error(`削除エラー: ${error.message}`);
    else {
      toast.success("削除しました");
      fetchVideos();
    }
  };

  // ─── ヘルパー ───
  const publishBadge = (isPublished: boolean) =>
    isPublished ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer select-none">
        <Eye className="h-3 w-3 mr-1" />
        公開中
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer select-none">
        <EyeOff className="h-3 w-3 mr-1" />
        下書き
      </Badge>
    );

  const totalPublished = videosList.filter((v) => v.is_published).length;
  const totalDraft = videosList.filter((v) => !v.is_published).length;

  // ─── 動画行を描画 ───
  const renderVideoRow = (video: Video, showSubcategory: boolean) => {
    const youtubeId = video.video_url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?\s]{11})/)?.[1];
    const thumbnailSrc = video.thumbnail_url || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : null);
    return (
      <TableRow key={video.id}>
        <TableCell>
          {thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt={video.title}
              className="w-14 h-9 object-cover rounded border"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <div className="w-14 h-9 rounded border bg-gray-100 flex items-center justify-center">
              <ImageIcon className="h-4 w-4 text-gray-400" />
            </div>
          )}
        </TableCell>
        <TableCell className="font-medium">{video.title}</TableCell>
        {showSubcategory && (
          <TableCell>
            <Badge variant="outline">{video.subcategory}</Badge>
          </TableCell>
        )}
        <TableCell>
          <button onClick={() => togglePublish(video.id, video.is_published ?? true)}>
            {publishBadge(video.is_published ?? true)}
          </button>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1 ${video.is_pinned ? "text-amber-500 hover:text-amber-600" : "text-gray-400 hover:text-amber-500"}`}
              onClick={() => togglePin(video.id, video.is_pinned ?? false)}
              title={video.is_pinned ? "ピン留め解除" : "ピン留め"}
            >
              {video.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
              {video.is_pinned ? "解除" : "ピン"}
            </Button>
            <AddVideoDialog video={video} onSuccess={fetchVideos}>
              <Button variant="ghost" size="sm" className="gap-1">
                <Pencil className="h-3 w-3" />
                編集
              </Button>
            </AddVideoDialog>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-red-600 hover:text-red-700"
              onClick={() => handleDelete(video.id, video.title)}
            >
              <Trash2 className="h-3 w-3" />
              削除
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">コンテンツ管理</h2>
        <p className="text-gray-500 mt-1">動画の管理・編集</p>
      </div>

      {/* ─── 統計カード ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">総動画数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videosList.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">公開中</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalPublished}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">下書き</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">{totalDraft}</div>
          </CardContent>
        </Card>
      </div>

      {/* ─── アクションバー ─── */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          className="gap-2"
          onClick={refreshYouTubeDurations}
          disabled={refreshingDurations}
        >
          <RefreshCw className={`h-4 w-4 ${refreshingDurations ? "animate-spin" : ""}`} />
          YouTube動画の長さを一括更新
        </Button>
        <AddVideoDialog onSuccess={fetchVideos} companyId={companyId}>
          <Button className="gap-2 bg-[#0079B3] hover:bg-[#0079B3]/90">
            <Plus className="h-4 w-4" />
            新しい動画を追加
          </Button>
        </AddVideoDialog>
      </div>

      {/* ─── 動画一覧 ─── */}
      {videosLoading ? (
        <div className="py-12 text-center text-gray-400 animate-pulse">読み込み中...</div>
      ) : (
        <div className="space-y-4">
          {/* ─── 会社説明会セクション ─── */}
          {(() => {
            const briefingVideos = videosList.filter((v) => v.category === BRIEFING_CATEGORY);
            return (
              <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-blue-700">
                    <VideoIcon className="h-4 w-4" />
                    {BRIEFING_CATEGORY}
                    <span className="text-xs font-normal text-blue-500 bg-blue-100 px-2 py-0.5 rounded-full ml-1">学生ポータル最上部に表示</span>
                  </CardTitle>
                  <CardDescription>{briefingVideos.length}本の動画</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">サムネイル</TableHead>
                        <TableHead>タイトル</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {briefingVideos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-gray-400">
                            会社説明会動画はありません
                          </TableCell>
                        </TableRow>
                      ) : (
                        briefingVideos.map((video) => renderVideoRow(video, false))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })()}

          {/* ─── 4つの魅力カテゴリ ─── */}
          {["目標の魅力", "人材の魅力", "活動の魅力", "条件の魅力"].map((category) => {
            const catVideos = videosList.filter((v) => v.category === category);
            return (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <VideoIcon className="h-4 w-4" />
                    {category}
                  </CardTitle>
                  <CardDescription>{catVideos.length}本の動画</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">サムネイル</TableHead>
                        <TableHead>タイトル</TableHead>
                        <TableHead>サブカテゴリ</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {catVideos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-gray-400">
                            このカテゴリに動画はありません
                          </TableCell>
                        </TableRow>
                      ) : (
                        catVideos.map((video) => renderVideoRow(video, true))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Youtube, HardDrive, Upload, Loader2, Film } from "lucide-react";
import { supabase, type Video } from "../../lib/supabase";

import { toast } from "sonner";
import { VideoThumbnailScrubber } from "./VideoThumbnailScrubber";

interface AddVideoDialogProps {
  children: React.ReactNode;
  onSuccess?: () => void;
  video?: Video;
  companyId?: string;
}

export const BRIEFING_CATEGORY = "会社説明会";

const categories = [
  { value: "目標の魅力", subcategories: ["会社基盤", "理念戦略"] },
  { value: "人材の魅力", subcategories: ["組織風土", "人的魅力"] },
  { value: "活動の魅力", subcategories: ["事業内容", "仕事内容"] },
  { value: "条件の魅力", subcategories: ["報酬体系", "仕事環境"] },
  { value: BRIEFING_CATEGORY, subcategories: [] },
];

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]{11})/);
  return match ? match[1] : null;
}

export function AddVideoDialog({ children, onSuccess, video, companyId }: AddVideoDialogProps) {
  const [open, setOpen] = useState(false);
  const [scrubberOpen, setScrubberOpen] = useState(false);
  const [videoTitle, setVideoTitle] = useState(video?.title || "");
  const [description, setDescription] = useState(video?.description || "");
  const [category, setCategory] = useState(video?.category || "");
  const [subcategory, setSubcategory] = useState(video?.subcategory || "");
  const [youtubeUrl, setYoutubeUrl] = useState(video?.video_url?.startsWith('https://www.youtube.com') || video?.video_url?.startsWith('https://youtu.be') ? video.video_url : "");
  const [driveUrl, setDriveUrl] = useState(video?.video_url?.startsWith('https://drive.google.com') ? video.video_url : "");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(video?.thumbnail_url || "");
  const [durationMin, setDurationMin] = useState(
    video?.duration_sec != null ? String(Math.floor(video.duration_sec / 60)) : ""
  );
  const [durationSec, setDurationSec] = useState(
    video?.duration_sec != null ? String(video.duration_sec % 60) : ""
  );
  const [loading, setLoading] = useState(false);
  const [durationFetching, setDurationFetching] = useState(false);
  const playerRef = useRef<any>(null);

  const selectedCategory = categories.find(c => c.value === category);
  const isBriefing = category === BRIEFING_CATEGORY;
  const youtubeId = extractYouTubeId(youtubeUrl);

  // ─── YouTube URL が変わったら IFrame API で再生時間を自動取得 ───
  useEffect(() => {
    if (!youtubeId) return;
    setDurationFetching(true);

    const divId = `yt-dur-${youtubeId}`;
    let div = document.getElementById(divId);
    if (!div) {
      div = document.createElement("div");
      div.id = divId;
      div.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;";
      document.body.appendChild(div);
    }

    const init = () => {
      playerRef.current?.destroy();
      playerRef.current = new (window as any).YT.Player(divId, {
        videoId: youtubeId,
        playerVars: { autoplay: 0 },
        events: {
          onReady: (e: any) => {
            const dur = Math.round(e.target.getDuration());
            if (dur > 0) {
              setDurationMin(String(Math.floor(dur / 60)));
              setDurationSec(String(dur % 60));
            }
            setDurationFetching(false);
            e.target.destroy();
            document.getElementById(divId)?.remove();
          },
        },
      });
    };

    if ((window as any).YT?.Player) {
      init();
    } else {
      const prev = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => { prev?.(); init(); };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    }

    return () => { setDurationFetching(false); };
  }, [youtubeId]);

  const handleSubmit = async (method: "youtube" | "drive" | "upload") => {
    setLoading(true);
    let videoUrl = "";

    if (method === "youtube") videoUrl = youtubeUrl;
    else if (method === "drive") videoUrl = driveUrl;
    else if (method === "upload" && uploadFile) {
      videoUrl = `upload://${uploadFile.name}`;
      toast.info("ファイルアップロードはURLの保持のみ行います（Storage機能は別途実装が必要です）");
    }

    const finalSubcategory = isBriefing ? "" : subcategory;
    const durationSecValue =
      (parseInt(durationMin || "0", 10) * 60) + parseInt(durationSec || "0", 10) || null;

    if (video) {
      const { error } = await supabase
        .from('videos')
        .update({
          title: videoTitle,
          description: description || null,
          category,
          subcategory: finalSubcategory,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl || null,
          duration_sec: durationSecValue,
        })
        .eq('id', video.id);

      if (error) {
        toast.error(`更新エラー: ${error.message}`);
      } else {
        toast.success("動画を更新しました");
        onSuccess?.();
        setOpen(false);
      }
    } else {
      const { error } = await supabase
        .from('videos')
        .insert([
          {
            title: videoTitle,
            description: description || null,
            category,
            subcategory: finalSubcategory,
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl || null,
            duration_sec: durationSecValue,
            is_published: false,
            available_phases: [],
            company_id: companyId || null,
          }
        ]);

      if (error) {
        toast.error(`追加エラー: ${error.message}`);
      } else {
        toast.success("動画を追加しました");
        onSuccess?.();
        setOpen(false);
        setVideoTitle("");
        setDescription("");
        setCategory("");
        setSubcategory("");
        setYoutubeUrl("");
        setDriveUrl("");
        setUploadFile(null);
        setThumbnailUrl("");
        setDurationMin("");
        setDurationSec("");
      }
    }
    setLoading(false);
  };

  const canSubmit = (url: string) =>
    !loading && !!videoTitle && !!category && (isBriefing || !!subcategory) && !!url;
  const canSubmitUpload =
    !loading && !!videoTitle && !!category && (isBriefing || !!subcategory) &&
    (!!(uploadFile) || !!video?.video_url?.startsWith('upload://'));

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{video ? "動画を編集" : "新しい動画を追加"}</DialogTitle>
            <DialogDescription>
              {video ? "動画の詳細情報を更新します" : "YouTubeリンク、Googleドライブリンク、またはファイルアップロードで動画を追加できます"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* 基本情報 */}
            <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-medium">基本情報</h3>

              <div className="space-y-2">
                <Label htmlFor="title">動画タイトル *</Label>
                <Input
                  id="title"
                  placeholder="例: 企業認知"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">説明文（任意・30文字程度）</Label>
                <Textarea
                  id="description"
                  placeholder="例: 社員が語る入社のきっかけと職場の雰囲気"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* サムネイル設定 */}
              <div className="space-y-2">
                <Label htmlFor="thumbnail-url">サムネイル画像URL（任意）</Label>
                <div className="flex gap-2">
                  <Input
                    id="thumbnail-url"
                    placeholder="https://example.com/thumbnail.jpg"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    className="flex-1"
                  />
                  {youtubeId && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 flex-shrink-0 border-[#0079B3] text-[#0079B3] hover:bg-[#E1F1F9]"
                      onClick={() => setScrubberOpen(true)}
                    >
                      <Film className="h-4 w-4" />
                      動画から選ぶ
                    </Button>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  未入力の場合はYouTubeのサムネイルを自動取得します
                </p>
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt="サムネイルプレビュー"
                    className="mt-2 rounded border h-24 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                )}
              </div>

              {/* 動画の長さ */}
              <div className="space-y-2">
                <Label>
                  動画の長さ（任意）
                  {durationFetching && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">取得中...</span>
                  )}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    disabled={durationFetching}
                    className="w-24 text-right"
                  />
                  <span className="text-sm text-gray-600">分</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0"
                    value={durationSec}
                    onChange={(e) => setDurationSec(e.target.value)}
                    disabled={durationFetching}
                    className="w-24 text-right"
                  />
                  <span className="text-sm text-gray-600">秒</span>
                </div>
              </div>

              <div className={isBriefing ? "" : "grid grid-cols-2 gap-4"}>
                <div className="space-y-2">
                  <Label htmlFor="category">カテゴリ *</Label>
                  <Select value={category} onValueChange={(value) => {
                    setCategory(value);
                    setSubcategory("");
                  }}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!isBriefing && (
                  <div className="space-y-2">
                    <Label htmlFor="subcategory">サブカテゴリ *</Label>
                    <Select
                      value={subcategory}
                      onValueChange={setSubcategory}
                      disabled={!category}
                    >
                      <SelectTrigger id="subcategory">
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedCategory?.subcategories.map(sub => (
                          <SelectItem key={sub} value={sub}>
                            {sub}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {isBriefing && (
                <p className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                  会社説明会動画は学生ポータルの最上部に大きく表示されます
                </p>
              )}
            </div>

            {/* 動画ソース */}
            <Tabs defaultValue={video?.video_url?.startsWith('https://drive.google.com') ? "drive" : video?.video_url?.startsWith('upload://') ? "upload" : "youtube"} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="youtube" className="gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube
                </TabsTrigger>
                <TabsTrigger value="drive" className="gap-2">
                  <HardDrive className="h-4 w-4" />
                  Google Drive
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-4 w-4" />
                  アップロード
                </TabsTrigger>
              </TabsList>

              <TabsContent value="youtube" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="youtube-url">YouTubeリンク *</Label>
                  <Input
                    id="youtube-url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    YouTube動画のURLを入力してください
                  </p>
                </div>
                <Button onClick={() => handleSubmit("youtube")} disabled={!canSubmit(youtubeUrl)} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {video ? "変更を保存" : "YouTubeリンクで追加"}
                </Button>
              </TabsContent>

              <TabsContent value="drive" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="drive-url">Googleドライブリンク *</Label>
                  <Input
                    id="drive-url"
                    placeholder="https://drive.google.com/file/d/..."
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    Googleドライブの動画リンクを入力してください（共有設定を「リンクを知っている全員」に変更してください）
                  </p>
                </div>
                <Button onClick={() => handleSubmit("drive")} disabled={!canSubmit(driveUrl)} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {video ? "変更を保存" : "Googleドライブリンクで追加"}
                </Button>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">動画ファイル *</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept="video/*"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  <p className="text-sm text-gray-500">
                    MP4, MOV, AVIなどの動画ファイルをアップロードできます（最大500MB）
                  </p>
                  {uploadFile && (
                    <div className="text-sm text-green-600 flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                </div>
                <Button onClick={() => handleSubmit("upload")} disabled={!canSubmitUpload} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {video ? "変更を保存" : "ファイルをアップロードして追加"}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* 動画スクラバー（YouTube URLが入力済みの場合のみ表示） */}
      {youtubeId && (
        <VideoThumbnailScrubber
          open={scrubberOpen}
          onClose={() => setScrubberOpen(false)}
          videoId={youtubeId}
          onSelect={(url) => {
            setThumbnailUrl(url);
            toast.success("サムネイルを設定しました");
          }}
        />
      )}
    </>
  );
}

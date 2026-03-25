import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { CheckCircle2, Play, Pause, Camera, Clipboard, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  getPlayerState(): number;
  destroy(): void;
}

interface VideoThumbnailScrubberProps {
  open: boolean;
  onClose: () => void;
  videoId: string;
  onSelect: (thumbnailUrl: string) => void;
}

// YouTube自動生成サムネイル(1.jpg≈25%, 2.jpg≈50%, 3.jpg≈75%)から最近傍を返す
function getAutoThumbnailByPosition(videoId: string, position: number): string {
  if (position < 0.375) return `https://img.youtube.com/vi/${videoId}/1.jpg`;
  if (position < 0.625) return `https://img.youtube.com/vi/${videoId}/2.jpg`;
  return `https://img.youtube.com/vi/${videoId}/3.jpg`;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoThumbnailScrubber({ open, onClose, videoId, onSelect }: VideoThumbnailScrubberProps) {
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 優先度: clipboardImageUrl > customUrl > scrubberLockedUrl > manualSelection > autoSelected
  const [clipboardImageUrl, setClipboardImageUrl] = useState<string | null>(null);  // スクリーンショット貼り付け
  const [scrubberLockedUrl, setScrubberLockedUrl] = useState<string | null>(null);  // スライダーで確定
  const [manualSelection, setManualSelection] = useState<string | null>(null);       // 自動生成クリック
  const [customUrl, setCustomUrl] = useState("");                                    // URL直接入力
  const [uploading, setUploading] = useState(false);

  const thumbnailOptions = [
    { label: "デフォルト", url: `https://img.youtube.com/vi/${videoId}/0.jpg` },
    { label: "フレーム①", url: `https://img.youtube.com/vi/${videoId}/1.jpg` },
    { label: "フレーム②", url: `https://img.youtube.com/vi/${videoId}/2.jpg` },
    { label: "フレーム③", url: `https://img.youtube.com/vi/${videoId}/3.jpg` },
  ];

  const autoSelected =
    duration > 0
      ? getAutoThumbnailByPosition(videoId, currentTime / duration)
      : thumbnailOptions[1].url;

  // 確定プレビューに使うURL（優先度順）
  const previewUrl =
    clipboardImageUrl ||
    customUrl.trim() ||
    scrubberLockedUrl ||
    manualSelection ||
    autoSelected;

  // 自動生成サムネイル選択のアクティブURL（clipboardImageUrl/customUrl/scrubberLockedUrlがない場合のみ有効）
  const activeThumbnail =
    clipboardImageUrl || customUrl.trim() || scrubberLockedUrl
      ? null
      : (manualSelection ?? autoSelected);

  const initPlayer = useCallback(() => {
    if (!playerContainerRef.current || !window.YT?.Player) return;

    playerContainerRef.current.innerHTML = "";
    const el = document.createElement("div");
    playerContainerRef.current.appendChild(el);

    playerRef.current = new window.YT.Player(el, {
      videoId,
      playerVars: { controls: 0, modestbranding: 1, rel: 0, fs: 0 },
      events: {
        onReady: (e) => {
          setDuration(e.target.getDuration());
          setPlayerReady(true);
          pollRef.current = setInterval(() => {
            if (!playerRef.current) return;
            setCurrentTime(playerRef.current.getCurrentTime());
            setIsPlaying(playerRef.current.getPlayerState() === 1);
          }, 200);
        },
      },
    });
  }, [videoId]);

  useEffect(() => {
    if (!open) return;

    const setup = () => {
      if (window.YT?.Player) {
        initPlayer();
      } else {
        window.onYouTubeIframeAPIReady = initPlayer;
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const script = document.createElement("script");
          script.src = "https://www.youtube.com/iframe_api";
          document.head.appendChild(script);
        }
      }
    };

    const timer = setTimeout(setup, 100);

    return () => {
      clearTimeout(timer);
      if (pollRef.current) clearInterval(pollRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
      setPlayerReady(false);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setClipboardImageUrl(null);
      setScrubberLockedUrl(null);
      setManualSelection(null);
      setCustomUrl("");
    };
  }, [open, initPlayer]);

  const handlePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    setCurrentTime(t);
    playerRef.current?.seekTo(t, true);
  };

  const handleSecondsInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Math.min(Math.max(0, Number(e.target.value)), duration);
    setCurrentTime(t);
    playerRef.current?.seekTo(t, true);
  };

  // スライダー現在位置を最優先サムネイルとして確定（YouTube自動生成の最近傍を選択）
  const handleLockScrubber = () => {
    setScrubberLockedUrl(autoSelected);
    setClipboardImageUrl(null);
    setManualSelection(null);
    setCustomUrl("");
  };

  // クリップボードから画像を取得 → Supabase Storageにアップロード
  const handleClipboardPaste = async () => {
    setUploading(true);
    try {
      const items = await navigator.clipboard.read();
      const imageItem = items.find((item) =>
        item.types.some((t) => t.startsWith("image/"))
      );
      if (!imageItem) {
        toast.info("クリップボードに画像が見つかりませんでした");
        setUploading(false);
        return;
      }

      const imageType = imageItem.types.find((t) => t.startsWith("image/")) as string;
      const blob = await imageItem.getType(imageType);
      const ext = imageType === "image/png" ? "png" : "jpg";
      const path = `${videoId}_${Date.now()}.${ext}`;

      // Supabase Storage にアップロード試行
      const { data, error } = await supabase.storage
        .from("thumbnails")
        .upload(path, blob, { contentType: imageType, upsert: true });

      if (!error && data) {
        const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(path);
        setClipboardImageUrl(urlData.publicUrl);
        setScrubberLockedUrl(null);
        setManualSelection(null);
        setCustomUrl("");
        toast.success("スクリーンショットをアップロードしました");
      } else {
        // Storageが使えない場合はdata: URLにフォールバック
        const reader = new FileReader();
        reader.onload = (ev) => {
          setClipboardImageUrl(ev.target?.result as string);
          setScrubberLockedUrl(null);
          setManualSelection(null);
          setCustomUrl("");
          toast.success("スクリーンショットを設定しました");
        };
        reader.readAsDataURL(blob);
      }
    } catch {
      toast.error(
        "クリップボードへのアクセスが拒否されました。ブラウザのアドレスバー左のアイコンからクリップボードの許可を付与してください"
      );
    }
    setUploading(false);
  };

  const handleConfirm = () => {
    onSelect(previewUrl);
    onClose();
  };

  const previewLabel = (() => {
    if (clipboardImageUrl) return "スクリーンショット（最優先）";
    if (customUrl.trim()) return "カスタムURL";
    if (scrubberLockedUrl) return "スライダーで選択（最優先）";
    return thumbnailOptions.find((o) => o.url === activeThumbnail)?.label ?? "—";
  })();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[92vw] sm:w-[92vw] sm:max-w-5xl flex flex-col h-[92vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>動画からサムネイルを選ぶ</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* YouTube Player */}
          <div className="w-full aspect-video bg-black rounded-lg overflow-hidden">
            <div ref={playerContainerRef} className="w-full h-full [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full" />
          </div>

          {!playerReady && (
            <div className="py-2 text-center text-sm text-gray-400 animate-pulse">
              プレイヤーを読み込み中...
            </div>
          )}

          {/* カスタムコントロール */}
          {playerReady && duration > 0 && (
            <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePlayPause}
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-[#0079B3] text-white hover:bg-[#0079B3]/90 transition-colors"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={Math.floor(duration)}
                  step={1}
                  value={Math.floor(currentTime)}
                  onChange={handleSliderChange}
                  className="flex-1 accent-[#0079B3] cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>秒数で移動:</span>
                  <input
                    type="number"
                    min={0}
                    max={Math.floor(duration)}
                    value={Math.floor(currentTime)}
                    onChange={handleSecondsInput}
                    className="w-20 border rounded px-2 py-0.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#0079B3]"
                  />
                  <span>秒 / {formatTime(duration)}</span>
                </div>
                <Button
                  size="sm"
                  className="bg-[#0079B3] hover:bg-[#0079B3]/90 gap-1"
                  onClick={handleLockScrubber}
                >
                  <Camera className="h-3 w-3" />
                  このフレームをサムネイルに設定
                </Button>
              </div>
              {scrubberLockedUrl && !clipboardImageUrl && (
                <div className="flex items-center justify-between text-xs px-3 py-2 bg-[#E1F1F9] rounded">
                  <span className="text-[#0079B3] font-medium">✓ スライダーで選択済み（最優先）</span>
                  <button
                    className="text-gray-500 underline hover:text-gray-700"
                    onClick={() => setScrubberLockedUrl(null)}
                  >
                    解除
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-400">
                スライダーで目的のフレームに移動してから「このフレームをサムネイルに設定」を押してください。
                より正確に指定したい場合は下の「スクリーンショットで取得」をご利用ください。
              </p>
            </div>
          )}

          {/* ─── スクリーンショットで正確なフレームを使う ─── */}
          <div className="space-y-2 p-3 border border-dashed border-amber-300 rounded-lg bg-amber-50">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-amber-800">📸 スクリーンショットで正確なフレームを取得</p>
              <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded">最高精度</span>
            </div>
            <ol className="text-xs text-amber-700 space-y-0.5 list-decimal list-inside">
              <li>動画を目的のシーンで一時停止する</li>
              <li className="flex items-start gap-1">
                <span>2.</span>
                <span>
                  OSのスクリーンショットでプレイヤー部分を撮影・コピー
                  <span className="ml-1 text-amber-600">（Mac: Cmd+Shift+4 → Ctrl+C でコピー / Win: Snipping Tool → Ctrl+C）</span>
                </span>
              </li>
              <li>下のボタンを押して貼り付け</li>
            </ol>

            {clipboardImageUrl ? (
              <div className="flex items-center gap-3 p-2 bg-white rounded border border-amber-300">
                <img
                  src={clipboardImageUrl}
                  alt="貼り付けたスクリーンショット"
                  className="h-16 aspect-video object-cover rounded border"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                />
                <div className="flex-1">
                  <p className="text-xs font-medium text-green-700">✓ スクリーンショット設定済み（最優先）</p>
                  <p className="text-xs text-gray-500">このフレームがサムネイルとして使用されます</p>
                </div>
                <button
                  onClick={() => setClipboardImageUrl(null)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400"
                  title="削除"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-amber-400 text-amber-700 hover:bg-amber-100"
                onClick={handleClipboardPaste}
                disabled={uploading}
              >
                <Clipboard className="h-4 w-4" />
                {uploading ? "アップロード中..." : "クリップボードから貼り付け"}
              </Button>
            )}
          </div>

          {/* YouTubeの自動生成サムネイルから選ぶ（スライダー/クリップボード選択より低優先） */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">YouTubeの自動生成サムネイルから選ぶ</p>
              {(clipboardImageUrl || scrubberLockedUrl) ? (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  より優先度の高い選択があります
                </span>
              ) : manualSelection ? (
                <button
                  className="text-xs text-[#0079B3] underline"
                  onClick={() => setManualSelection(null)}
                >
                  プレイヤー位置に戻す
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {thumbnailOptions.map((opt) => {
                const isActive = activeThumbnail === opt.url;
                const disabled = !!(clipboardImageUrl || scrubberLockedUrl || customUrl.trim());
                return (
                  <button
                    key={opt.url}
                    onClick={() => {
                      if (disabled) return;
                      setManualSelection(opt.url);
                    }}
                    disabled={disabled}
                    className={`relative rounded-md overflow-hidden border-2 transition-all ${
                      disabled
                        ? "opacity-40 cursor-not-allowed border-gray-200"
                        : isActive
                        ? "border-[#0079B3] ring-2 ring-[#0079B3]/20"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <img
                      src={opt.url}
                      alt={opt.label}
                      className="w-full aspect-video object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                    />
                    {isActive && (
                      <div className="absolute top-1 right-1">
                        <CheckCircle2 className="h-5 w-5 text-[#0079B3] bg-white rounded-full" />
                      </div>
                    )}
                    <span
                      className={`absolute bottom-0 left-0 right-0 text-xs text-white text-center py-0.5 ${
                        isActive ? "bg-[#0079B3]/80" : "bg-black/50"
                      }`}
                    >
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400">
              ※ YouTubeが自動生成した代表フレーム4点から選択できます。任意のフレームを使うには上の「スクリーンショットで取得」をご利用ください。
            </p>
          </div>

          {/* 画像URL直接入力 */}
          <div className="space-y-2">
            <Label htmlFor="custom-thumbnail-url" className="text-sm font-medium">
              または画像URLを直接入力
            </Label>
            <Input
              id="custom-thumbnail-url"
              placeholder="https://example.com/thumbnail.jpg"
              value={customUrl}
              onChange={(e) => {
                setCustomUrl(e.target.value);
                setClipboardImageUrl(null);
                setScrubberLockedUrl(null);
                setManualSelection(null);
              }}
            />
            {customUrl.trim() && (
              <img
                src={customUrl}
                alt="プレビュー"
                className="h-20 rounded border object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>

          {/* 確定プレビュー */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <img
              src={previewUrl}
              alt="設定するサムネイル"
              className="h-14 aspect-video object-cover rounded border"
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
            />
            <div>
              <p className="text-xs text-gray-500">設定するサムネイル</p>
              <p className="text-sm font-medium text-[#0079B3]">{previewLabel}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={onClose}>キャンセル</Button>
          <Button className="bg-[#0079B3] hover:bg-[#0079B3]/90" onClick={handleConfirm}>
            このサムネイルを設定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

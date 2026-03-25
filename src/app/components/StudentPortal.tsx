import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import type { Student, Video, WatchEventType } from "../../lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { Play, Clock, ArrowLeft, AlertCircle, Pin } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const formatDuration = (sec: number): string => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m}分${s}秒` : `${m}分`;
};

// ─── YouTube ID を抽出する（多様な形式に対応）
const extractYouTubeId = (url: string): string | null => {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
};

const getThumbnail = (video: Video) => {
    if (video.thumbnail_url) return video.thumbnail_url;
    const youtubeId = video.video_url ? extractYouTubeId(video.video_url) : null;
    if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    return null;
};

// ─── 視聴イベント記録フック
function useWatchTracker(studentId: string | null, videoId: string | null, companyId: string | null) {
    const sessionId = useRef<string | null>(null);
    const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearHeartbeat = useCallback(() => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
    }, []);

    const recordEvent = useCallback(async (eventType: WatchEventType, positionSec: number) => {
        if (!studentId || !videoId) return;
        await supabase.from("watch_events").insert({
            student_id: studentId,
            video_id: videoId,
            event_type: eventType,
            position_sec: positionSec,
            session_id: sessionId.current,
            company_id: companyId,
        });
    }, [studentId, videoId, companyId]);

    const onPlay = useCallback((getCurrentTime: () => number) => {
        sessionId.current = uuidv4();
        recordEvent("play", getCurrentTime());
        heartbeatRef.current = setInterval(() => {
            recordEvent("heartbeat", getCurrentTime());
        }, 30000);
    }, [recordEvent]);

    const onPause = useCallback((positionSec: number) => {
        recordEvent("pause", positionSec);
        clearHeartbeat();
    }, [recordEvent, clearHeartbeat]);

    const onEnded = useCallback((positionSec: number) => {
        recordEvent("ended", positionSec);
        clearHeartbeat();
    }, [recordEvent, clearHeartbeat]);

    const onSeek = useCallback((positionSec: number) => {
        recordEvent("seek", positionSec);
    }, [recordEvent]);

    useEffect(() => () => clearHeartbeat(), [clearHeartbeat]);

    return { onPlay, onPause, onEnded, onSeek };
}

// ─── VideoPlayer コンポーネント
interface VideoPlayerProps {
    video: Video;
    studentId: string;
    companyId: string | null;
    onBack: () => void;
}

function VideoPlayer({ video, studentId, companyId, onBack }: VideoPlayerProps) {
    const playerDivId = `yt-player-${video.id}`;
    const playerRef = useRef<any>(null);
    const tracker = useWatchTracker(studentId, video.id, companyId);
    const youtubeId = video.video_url ? extractYouTubeId(video.video_url) : null;

    useEffect(() => {
        if (!youtubeId) return;

        const initPlayer = () => {
            playerRef.current = new window.YT.Player(playerDivId, {
                videoId: youtubeId,
                playerVars: { rel: 0, modestbranding: 1 },
                events: {
                    onStateChange: (event: any) => {
                        const p = playerRef.current;
                        if (!p) return;
                        const pos = p.getCurrentTime();
                        if (event.data === window.YT.PlayerState.PLAYING) {
                            tracker.onPlay(() => p.getCurrentTime());
                        } else if (event.data === window.YT.PlayerState.PAUSED) {
                            tracker.onPause(pos);
                        } else if (event.data === window.YT.PlayerState.ENDED) {
                            tracker.onEnded(p.getDuration());
                        }
                    },
                },
            });
        };

        if (window.YT?.Player) {
            initPlayer();
        } else {
            const tag = document.createElement("script");
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
            window.onYouTubeIframeAPIReady = initPlayer;
        }

        return () => { playerRef.current?.destroy(); };
    }, [youtubeId, playerDivId, tracker]);

    if (!youtubeId) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={onBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> 一覧に戻る
                </Button>
                <div className="rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                    <div className="text-white text-center space-y-2">
                        <Play className="h-16 w-16 mx-auto opacity-40" />
                        <p className="opacity-60">この動画は準備中です</p>
                    </div>
                </div>
                <h2 className="text-2xl font-bold">{video.title}</h2>
                {video.description && <p className="text-gray-600">{video.description}</p>}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Button variant="ghost" onClick={onBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> 一覧に戻る
            </Button>
            <div className="rounded-lg overflow-hidden bg-black aspect-video">
                <div id={playerDivId} className="w-full h-full" />
            </div>
            <div>
                <h2 className="text-2xl font-bold">{video.title}</h2>
                {video.description && <p className="text-gray-600 mt-1">{video.description}</p>}
                {video.duration_sec && (
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                        <Clock className="h-4 w-4" />
                        {formatDuration(video.duration_sec)}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── メイン StudentPortal コンポーネント ───
export function StudentPortal() {
    const [student, setStudent] = useState<Student | null>(null);
    const [companyId, setCompanyId] = useState<string | null>(null);
    const [videos, setVideos] = useState<Video[]>([]);
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [seenVideoIds, setSeenVideoIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVideos = async (cId: string | null) => {
            let query = supabase
                .from("videos")
                .select("*")
                .eq("is_published", true);

            if (cId) {
                query = query.eq("company_id", cId);
            }

            const { data } = await query;
            setVideos(data || []);
        };

        const init = async () => {
            const params = new URLSearchParams(window.location.search);
            const token = params.get("token");

            if (!token) {
                setError("URLにトークンが含まれていません。正しいURLからアクセスしてください。");
                setLoading(false);
                return;
            }

            const { data: studentData, error: studentError } = await supabase
                .from("students")
                .select("*")
                .eq("token", token)
                .maybeSingle();

            if (studentError || !studentData) {
                setError("URLが無効または期限切れです。採用担当者にご連絡ください。");
                setLoading(false);
                return;
            }

            // トークン有効期限チェック
            if (studentData.token_expires_at && new Date(studentData.token_expires_at) < new Date()) {
                setError(
                    "このURLの有効期限が切れています。\n" +
                    "引き続きコンテンツをご覧になりたい場合は、採用担当者に新しいURLの発行をご依頼ください。"
                );
                setLoading(false);
                return;
            }

            setStudent(studentData);
            const cId = studentData.company_id || null;
            setCompanyId(cId);

            // ─── 視聴済み動画IDをlocalStorageから復元 ───
            const storageKey = `seen_videos_${token}`;
            try {
                const stored = localStorage.getItem(storageKey);
                setSeenVideoIds(new Set(stored ? JSON.parse(stored) : []));
            } catch {
                setSeenVideoIds(new Set());
            }

            await fetchVideos(cId);
            setLoading(false);
        };

        init();

        // ─── リアルタイム購読（公開状態の変更を即時反映） ───
        let latestCompanyId: string | null = null;
        let pollingInterval: ReturnType<typeof setInterval> | null = null;

        const refreshContent = () => fetchVideos(latestCompanyId);

        // ポーリング開始/停止ヘルパー
        const startPolling = () => {
            if (!pollingInterval) {
                pollingInterval = setInterval(refreshContent, 30000);
            }
        };
        const stopPolling = () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
            }
        };

        // Realtime: 動画テーブルのみ購読
        const channel = supabase
            .channel("student-content-changes")
            .on("postgres_changes", { event: "*", schema: "public", table: "videos" }, refreshContent)
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    stopPolling(); // Realtime 接続成功 → ポーリング停止
                } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    startPolling(); // Realtime 切断 → ポーリングにフォールバック
                }
            });

        // 初期状態: Realtime接続まではポーリングで補完
        startPolling();

        // ─── タブ復帰時に即時再取得 ───
        const handleVisibilityChange = () => {
            if (!document.hidden) refreshContent();
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            supabase.removeChannel(channel);
            stopPolling();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-3 animate-pulse">
                    <div className="w-12 h-12 bg-blue-200 rounded-full mx-auto" />
                    <p className="text-gray-500">読み込み中...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Card className="max-w-md w-full mx-4">
                    <CardContent className="p-8 text-center space-y-4">
                        <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
                        <h1 className="text-xl font-bold text-gray-800">アクセスできません</h1>
                        <p className="text-gray-600 text-sm">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!student) return null;

    // ─── 動画を「視聴済み」としてlocalStorageに保存 ───
    const markVideoSeen = (videoId: string) => {
        const token = new URLSearchParams(window.location.search).get("token") ?? "";
        const storageKey = `seen_videos_${token}`;
        setSeenVideoIds((prev) => {
            const next = new Set(prev);
            next.add(videoId);
            localStorage.setItem(storageKey, JSON.stringify([...next]));
            return next;
        });
    };

    const handleSelectVideo = (video: Video) => {
        markVideoSeen(video.id);
        setSelectedVideo(video);
    };

    // ピン留め動画を先頭にソート
    const sortedVideos = [...videos].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));

    return (
        <div className="min-h-screen bg-gray-50">
            {/* ヘッダー */}
            <header className="bg-gradient-to-r from-[#0079B3] to-[#5CA7D1] text-white px-6 py-6">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-bold">採用情報ポータル</h1>
                    <div className="text-right text-sm">
                        <div className="font-medium text-lg">{student.name} 様</div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                {selectedVideo ? (
                    <VideoPlayer
                        video={selectedVideo}
                        studentId={student.id}
                        companyId={companyId}
                        onBack={() => setSelectedVideo(null)}
                    />
                ) : (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-2xl font-bold">{student.name} 様へのコンテンツ</h2>
                            <p className="text-gray-500 mt-1">限定公開のコンテンツです。ぜひご覧ください。</p>
                        </div>

                        {sortedVideos.length === 0 ? (
                            <div className="text-center py-16 text-gray-400">
                                <Play className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                <p>現在公開中のコンテンツはありません</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {sortedVideos.map((video) => (
                                    <Card
                                        key={video.id}
                                        className="group hover:shadow-lg transition-all cursor-pointer"
                                        onClick={() => handleSelectVideo(video)}
                                    >
                                        <CardContent className="p-0">
                                            <div className="relative aspect-video bg-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                                                <ImageWithFallback
                                                    src={getThumbnail(video) || ""}
                                                    alt={video.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                                                />
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
                                                        <Play className="h-7 w-7 text-[#0079B3] ml-1" fill="currentColor" />
                                                    </div>
                                                </div>
                                                <div className="absolute top-2 left-2 flex gap-1">
                                                    {video.is_pinned && (
                                                        <div className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                                                            <Pin className="h-3 w-3" />
                                                            おすすめ
                                                        </div>
                                                    )}
                                                    {!seenVideoIds.has(video.id) && (
                                                        <div className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
                                                            New
                                                        </div>
                                                    )}
                                                </div>
                                                {video.duration_sec && (
                                                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDuration(video.duration_sec)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4 space-y-2">
                                                <h3 className="font-semibold line-clamp-2 group-hover:text-[#0079B3] transition-colors">
                                                    {video.title}
                                                </h3>
                                                {video.description && (
                                                    <p className="text-sm text-gray-600 line-clamp-2">{video.description}</p>
                                                )}
                                                {video.category && (
                                                    <Badge variant="secondary" className="text-xs">{video.category}</Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

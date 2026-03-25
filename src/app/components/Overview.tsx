import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "./ui/skeleton";
import { Users, Video, Eye, TrendingUp, Clock, Sparkles } from "lucide-react";
import { supabase } from "../../lib/supabase";

const COLORS = ["#5CA7D1", "#7DBDDD", "#0079B3", "#5CA7D1", "#7DBDDD", "#0079B3"];

interface RawData {
  students: { id: string }[];
  playEvents: { student_id: string; video_id: string; videos: { category: string | null } | null }[];
  heartbeatEvents: { student_id: string; video_id: string; videos: { category: string | null } | null }[];
  totalVideos: number;
}

export function Overview({ companyId }: { companyId: string }) {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState<RawData>({
    students: [],
    playEvents: [],
    heartbeatEvents: [],
    totalVideos: 0,
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { count: videoCount } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('company_id', companyId);

      const { data: events } = await supabase
        .from('watch_events')
        .select('student_id, event_type, video_id, videos(category)')
        .eq('company_id', companyId);

      const { data: studentData } = await supabase.from('students').select('id').eq('company_id', companyId);

      const playEvents = events?.filter(e => e.event_type === 'play') || [];
      const heartbeatEvents = events?.filter(e => e.event_type === 'heartbeat') || [];

      setRawData({
        students: (studentData || []) as { id: string }[],
        playEvents: playEvents as any[],
        heartbeatEvents: heartbeatEvents as any[],
        totalVideos: videoCount || 0,
      });
      setLoading(false);
    }

    fetchData();

    const channel = supabase
      .channel('overview-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'watch_events' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [companyId]);

  const stats = useMemo(() => {
    const { students, playEvents, heartbeatEvents, totalVideos } = rawData;

    const totalStudents = students.length;
    const totalViews = playEvents.length;
    const totalWatchSec = heartbeatEvents.length * 30;
    const totalWatchTimeMin = Math.floor(totalWatchSec / 60);
    const avgViewsPerStudent = totalStudents > 0 ? (totalViews / totalStudents).toFixed(1) : "0.0";
    const avgWatchTimePerStudent = totalStudents > 0 ? Math.floor(totalWatchTimeMin / totalStudents) : 0;

    // カテゴリ別
    const catCountMap: Record<string, number> = {};
    const catTimeMap: Record<string, number> = {};

    playEvents.forEach((e: any) => {
      const cat = e.videos?.category || "未分類";
      catCountMap[cat] = (catCountMap[cat] || 0) + 1;
    });
    heartbeatEvents.forEach((e: any) => {
      const cat = e.videos?.category || "未分類";
      catTimeMap[cat] = (catTimeMap[cat] || 0) + 30;
    });

    const categoryData = Object.entries(catCountMap).map(([name, count]) => ({ name, 視聴回数: count }));
    const categoryWatchTimeData = Object.entries(catTimeMap).map(([name, sec]) => ({ name, 視聴時間: Math.floor(sec / 60) }));

    // 学生別視聴状況
    const studentViewMap: Record<string, number> = {};
    playEvents.forEach((e: any) => {
      studentViewMap[e.student_id] = (studentViewMap[e.student_id] || 0) + 1;
    });
    const viewedStudents = Object.keys(studentViewMap).length;
    const notViewedStudents = totalStudents - viewedStudents;

    const viewStatusData = [
      { name: "視聴済み", value: viewedStudents },
      { name: "未視聴", value: notViewedStudents },
    ].filter(d => d.value > 0);

    return {
      totalStudents,
      totalVideos,
      totalViews,
      totalWatchTimeMin,
      avgViewsPerStudent,
      avgWatchTimePerStudent,
      categoryData,
      categoryWatchTimeData,
      viewStatusData,
    };
  }, [rawData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">全体概要</h2>
        <p className="text-gray-500 mt-1">採用動画の視聴状況サマリー</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総学生数</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}名</div>
            <p className="text-xs text-gray-500 mt-1">登録済み学生</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">動画本数</CardTitle>
            <Video className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVideos}本</div>
            <p className="text-xs text-gray-500 mt-1">登録済みの動画</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総視聴回数</CardTitle>
            <Eye className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}回</div>
            <p className="text-xs text-gray-500 mt-1">全動画の合計</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総視聴時間</CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWatchTimeMin}分</div>
            <p className="text-xs text-gray-500 mt-1">全動画の合計</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">学生平均</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgViewsPerStudent}回</div>
            <p className="text-xs text-gray-500 mt-1">{stats.avgWatchTimePerStudent}分/人</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 視聴状況 */}
        <Card>
          <CardHeader>
            <CardTitle>学生の視聴状況</CardTitle>
            <CardDescription>動画を視聴した学生と未視聴の学生の割合</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {stats.viewStatusData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={stats.viewStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    <Cell fill="#5CA7D1" />
                    <Cell fill="#E5E7EB" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">データがありません</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* カテゴリ別視聴回数 */}
        <Card>
          <CardHeader>
            <CardTitle>カテゴリ別視聴回数</CardTitle>
            <CardDescription>どのカテゴリの動画が視聴されているか</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {stats.categoryData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={stats.categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="視聴回数"
                  >
                    {stats.categoryData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">データがありません</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* カテゴリ別視聴時間 */}
        <Card>
          <CardHeader>
            <CardTitle>カテゴリ別視聴時間</CardTitle>
            <CardDescription>各カテゴリの総視聴時間（分）</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.categoryWatchTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="視聴時間" fill="#5CA7D1" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* カテゴリ別視聴時間（円グラフ） */}
        <Card>
          <CardHeader>
            <CardTitle>カテゴリ別視聴時間の割合</CardTitle>
            <CardDescription>どのカテゴリに時間を費やしているか</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              {stats.categoryWatchTimeData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={stats.categoryWatchTimeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="視聴時間"
                  >
                    {stats.categoryWatchTimeData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">データがありません</div>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 分析インサイト - Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle>分析インサイト</CardTitle>
          <CardDescription>データから得られる示唆</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-[#5CA7D1]" />
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-700">Coming Soon</p>
              <p className="text-sm text-gray-500 mt-1">
                AI連携による分析インサイトは近日公開予定です
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

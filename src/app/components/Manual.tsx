import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
  BookOpen, 
  Target, 
  TrendingUp, 
  Video, 
  Users, 
  BarChart3,
  Eye,
  PlayCircle,
  FileText,
  Lightbulb,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

export function Manual() {
  const features = [
    {
      icon: BarChart3,
      title: "全体概要",
      description: "採用活動全体のパフォーマンスを一目で把握できます",
      details: [
        "全フェーズの視聴状況をリアルタイムで確認",
        "コンテンツカテゴリごとの人気度を可視化",
        "学生の興味トレンドを把握し、戦略的な改善点を発見"
      ],
      color: "bg-[#5CA7D1]"
    },
    {
      icon: Users,
      title: "フェーズ別分析",
      description: "採用の各段階における学生の視聴行動を深掘り分析",
      details: [
        "認知・興味・応募・選考・内定の5フェーズを詳細に分析",
        "各フェーズの学生の視聴パターンを可視化",
        "フェーズごとに求められる情報ニーズの違いを把握"
      ],
      color: "bg-[#7DBDDD]"
    },
    {
      icon: TrendingUp,
      title: "コンテンツ別分析",
      description: "動画・資料ごとの視聴データを多角的に分析",
      details: [
        "動画を4カテゴリ（目標・人材・活動・条件の魅力）で管理",
        "視聴回数・完視聴率・エンゲージメントを測定",
        "人気コンテンツランキングを自動抽出"
      ],
      color: "bg-[#0079B3]"
    },
    {
      icon: Video,
      title: "コンテンツ管理",
      description: "動画・パンフレット・記事を一元管理",
      details: [
        "コンテンツの追加・編集・削除が簡単に行える",
        "カテゴリやタグで整理し、検索性を向上",
        "各コンテンツのパフォーマンスを即座に確認"
      ],
      color: "bg-[#5CA7D1]"
    },
    {
      icon: Users,
      title: "学生管理",
      description: "学生データを効率的に管理",
      details: [
        "学生ごとの視聴履歴と興味領域を把握",
        "フェーズ別に学生をセグメント化",
        "個別の視聴行動から採用戦略をカスタマイズ"
      ],
      color: "bg-[#7DBDDD]"
    }
  ];

  const useCases = [
    {
      icon: Target,
      title: "コンテンツ戦略の最適化",
      description: "視聴データから人気コンテンツを特定し、効果の低いコンテンツを改善。学生が本当に求める情報を提供できます。"
    },
    {
      icon: Lightbulb,
      title: "フェーズ別アプローチ",
      description: "各採用フェーズで学生が注目する情報カテゴリを分析。認知段階では「目標の魅力」、選考段階では「条件の魅力」など、適切な情報を適切なタイミングで提供できます。"
    },
    {
      icon: Eye,
      title: "学生視点の理解",
      description: "実際に学生が見る画面（学生視点モード）で、学生体験を確認。動画・パンフレット・記事・相談予約など、学生がどう情報を得るかを把握できます。"
    }
  ];

  const howToUse = [
    {
      step: "1",
      title: "全体概要で現状を把握",
      description: "まずは全体概要ページで、採用活動全体のパフォーマンスを確認しましょう。どのコンテンツカテゴリが人気か、各フェーズの状況はどうかを一目で把握できます。"
    },
    {
      step: "2",
      title: "フェーズ別に深掘り分析",
      description: "気になるフェーズをクリックして詳細分析。各フェーズの学生がどのコンテンツをよく見ているか、完視聴率はどうかなどを確認し、改善点を見つけましょう。"
    },
    {
      step: "3",
      title: "コンテンツを最適化",
      description: "コンテンツ別分析で、個別の動画や資料のパフォーマンスを確認。視聴率が低いコンテンツは内容を見直し、人気コンテンツの要素を他にも展開しましょう。"
    },
    {
      step: "4",
      title: "学生視点で体験確認",
      description: "画面左上の「採用映像分析」タイトルをクリックして「学生視点」モードに切り替え。実際に学生が見る画面を確認し、ユーザー体験を改善できます。"
    }
  ];

  return (
    <div className="space-y-8">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-[#0079B3] to-[#5CA7D1] text-white p-8 rounded-lg">
        <div className="flex items-start gap-4">
          <BookOpen className="h-12 w-12 flex-shrink-0" />
          <div>
            <h1 className="text-4xl font-bold mb-2">マニュアル</h1>
            <p className="text-white/80 text-lg">
              採用映像分析ツールの使い方と活用方法をご紹介します
            </p>
          </div>
        </div>
      </div>

      {/* システム概要 */}
      <Card className="border-[#5CA7D1]">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-[#E1F1F9] rounded-lg flex items-center justify-center flex-shrink-0">
              <Target className="h-6 w-6 text-[#0079B3]" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">このツールについて</h2>
              <p className="text-gray-700 leading-relaxed">
                採用映像分析ツールは、説明会や面接以外の時間での<strong>学生の行動を可視化</strong>し、
                採用活動の質を向上させるためのツールです。
                学生の視聴行動を、認知・興味・応募・選考・内定の5つのフェーズに分けて追跡。
                動画を「目標の魅力」「人材の魅力」「活動の魅力」「条件の魅力」の4カテゴリで管理し、
                <strong>学生が本当に求めている情報</strong>を明らかにします。
              </p>
            </div>
          </div>
          <div className="bg-[#E1F1F9] p-4 rounded-lg">
            <p className="text-sm text-[#0079B3] flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              データに基づいてコンテンツを継続的に改善し、学生により良い採用体験を提供できます
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 主要機能 */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <PlayCircle className="h-6 w-6 text-[#0079B3]" />
          主要機能
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-1">{feature.title}</h3>
                      <p className="text-sm text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-[#5CA7D1] flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 活用シーン */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-[#0079B3]" />
          活用シーン
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {useCases.map((useCase, index) => {
            const Icon = useCase.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#E1F1F9] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-[#0079B3]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-2">{useCase.title}</h3>
                      <p className="text-gray-700 leading-relaxed">{useCase.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 使い方ガイド */}
      <div>
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <FileText className="h-6 w-6 text-[#0079B3]" />
          使い方ガイド
        </h2>
        <div className="space-y-4">
          {howToUse.map((guide, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#0079B3] rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xl">{guide.step}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2">{guide.title}</h3>
                    <p className="text-gray-700 leading-relaxed">{guide.description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0 mt-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tips */}
      <Card className="border-[#5CA7D1]">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-[#0079B3]" />
            活用のヒント
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#5CA7D1] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">定期的なレビュー</p>
                <p className="text-sm text-gray-600">週次でデータを確認し、トレンドの変化を早期に発見しましょう</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#5CA7D1] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">A/Bテスト</p>
                <p className="text-sm text-gray-600">新しいコンテンツを追加したら、既存コンテンツとパフォーマンスを比較しましょう</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#5CA7D1] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">学生視点の確認</p>
                <p className="text-sm text-gray-600">モード切替機能で学生体験を定期的にチェックし、UXを改善しましょう</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#5CA7D1] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">フェーズ間の比較</p>
                <p className="text-sm text-gray-600">各フェーズで学生の興味がどう変わるかを分析し、タイムリーな情報提供を心がけましょう</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
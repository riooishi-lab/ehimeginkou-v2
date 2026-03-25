import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Upload, FileText, AlertCircle, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";

interface AddStudentCSVDialogProps {
  children: React.ReactNode;
  onSuccess?: () => void;
  companyId?: string;
}

interface UploadedStudent {
  name: string;
  email: string;
  token: string;
}

export function AddStudentCSVDialog({ children, onSuccess, companyId }: AddStudentCSVDialogProps) {
  const [open, setOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedStudents, setUploadedStudents] = useState<UploadedStudent[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setError("");
    setUploadedStudents([]);

    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError("CSVファイルを選択してください");
        setCsvFile(null);
        return;
      }
      setCsvFile(file);
    }
  };

  /**
   * 引用符に対応した堅牢なCSVパース
   */
  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines: string[][] = [];
    let currentRow: string[] = [];
    let currentField = "";
    let inQuotes = false;

    // Windows形式の改行を統一
    const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

    for (let i = 0; i < normalizedText.length; i++) {
      const char = normalizedText[i];
      const nextChar = normalizedText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++; // エスケープされた引用符をスキップ
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === '\n' && !inQuotes) {
        currentRow.push(currentField.trim());
        lines.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
    if (currentRow.length > 0 || currentField) {
      currentRow.push(currentField.trim());
      lines.push(currentRow);
    }

    if (lines.length < 2) return [];

    const headers = lines[0];
    return lines.slice(1)
      .filter(row => row.length >= Math.min(2, headers.length))
      .map(row => {
        const entry: Record<string, string> = {};
        headers.forEach((h, i) => {
          entry[h] = row[i] || "";
        });
        return entry;
      });
  };

  const handleSubmit = async () => {
    if (!csvFile) return;

    setIsUploading(true);
    setError("");

    try {
      const arrayBuffer = await csvFile.arrayBuffer();

      // 文字コードの自動判定（簡易的）
      // 先頭数バイトを見て判定するか、とりあえずUTF-8でデコードして壊れていたらShift-JISを試す
      let text = "";
      try {
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        text = utf8Decoder.decode(arrayBuffer);
      } catch (e) {
        // UTF-8でデコード失敗した場合はShift-JIS（Windows-31J）を試行
        const sjisDecoder = new TextDecoder('shift-jis');
        text = sjisDecoder.decode(arrayBuffer);
      }

      const rows = parseCSV(text);

      if (rows.length === 0) {
        setError("CSVに有効なデータが見つかりませんでした。1行目はヘッダー（ATS_ID,名前,メールアドレス...）である必要があります。");
        setIsUploading(false);
        return;
      }

      // メールアドレスの簡易バリデーション
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      const validationErrors: string[] = [];
      const seenEmails = new Set<string>();
      const studentsToUpsert: Array<{
        name: string; email: string; university: string | null;
        department: string | null; ats_id: string | null; company_id: string | null;
      }> = [];

      rows.forEach((row, i) => {
        const atsId = (row["ATS_ID"] || row["ats_id"] || row["ATS ID"] || "").trim();
        const name = (row["名前"] || row["name"] || "").trim();
        const email = (row["メールアドレス"] || row["email"] || "").trim().toLowerCase();

        if (!name || !email) return; // 必須フィールド欠損はスキップ

        if (!emailRegex.test(email)) {
          validationErrors.push(`行${i + 2}: メールアドレス形式が不正 (${email})`);
          return;
        }

        if (seenEmails.has(email)) {
          validationErrors.push(`行${i + 2}: メールアドレスが重複 (${email})`);
          return;
        }
        seenEmails.add(email);

        if (name.length > 100) {
          validationErrors.push(`行${i + 2}: 名前が長すぎます (100文字以内)`);
          return;
        }

        studentsToUpsert.push({
          name,
          email,
          university: (row["大学"] || row["university"] || "").trim() || null,
          department: (row["学部"] || row["department"] || "").trim() || null,
          ats_id: atsId || null,
          company_id: companyId || null,
        });
      });

      if (validationErrors.length > 0) {
        const maxShow = 5;
        const msg = validationErrors.slice(0, maxShow).join("\n");
        const more = validationErrors.length > maxShow ? `\n...他${validationErrors.length - maxShow}件のエラー` : "";
        setError(`バリデーションエラー:\n${msg}${more}`);
        setIsUploading(false);
        return;
      }

      if (studentsToUpsert.length === 0) {
        setError("有効なデータが見つかりませんでした。ヘッダー（名前, メールアドレス）が正しいか確認してください。");
        setIsUploading(false);
        return;
      }

      const { data, error: upsertError } = await supabase
        .from('students')
        .upsert(studentsToUpsert, { onConflict: 'email,company_id' })
        .select('name, email, token');

      if (upsertError) {
        setError(`データベースエラー: ${upsertError.message} (${upsertError.code})`);
        setIsUploading(false);
        return;
      }

      const results: UploadedStudent[] = (data || []).map((s: { name: string; email: string; token: string }) => ({
        name: s.name,
        email: s.email,
        token: s.token,
      }));

      setUploadedStudents(results);
      setCsvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setIsUploading(false);
      toast.success(`${results.length}名の学生を取り込みました`);
      onSuccess?.();
    } catch (e: any) {
      setError(`ファイル読み込みエラー: ${e.message}`);
      setIsUploading(false);
    }
  };

  const getWatchUrl = (token: string) =>
    `${window.location.origin}/watch?token=${token}`;

  const copyUrl = (token: string) => {
    navigator.clipboard.writeText(getWatchUrl(token));
    toast.success("URLをコピーしました");
  };

  const downloadSampleCSV = () => {
    const sampleData = `ATS_ID,名前,メールアドレス,大学,学部\nATS-001,田中太郎,tanaka@example.com,東京大学,経済学部\nATS-002,佐藤花子,sato@example.com,早稲田大学,商学部\nATS-003,鈴木一郎,suzuki@example.com,慶應義塾大学,法学部`;

    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'students_sample.csv';
    link.click();
  };

  const handleClose = () => {
    setCsvFile(null);
    setError("");
    setUploadedStudents([]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSVで学生を追加</DialogTitle>
          <DialogDescription>
            CSVファイルをアップロードして複数の学生を一括で追加できます
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {uploadedStudents.length > 0 ? (
            /* 取り込み完了：URL一覧表示 */
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {uploadedStudents.length}名の学生を取り込みました。視聴URLを各学生にお送りください。
                </AlertDescription>
              </Alert>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {uploadedStudents.map((s) => (
                  <div key={s.email} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-gray-500 truncate">{getWatchUrl(s.token)}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyUrl(s.token)}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="shrink-0"
                    >
                      <a href={getWatchUrl(s.token)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
              <Button onClick={handleClose} className="w-full">完了</Button>
            </div>
          ) : (
            /* アップロードフォーム */
            <>
              {/* CSVフォーマット説明 */}
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">CSVファイルのフォーマット:</p>
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                      ATS_ID,名前,メールアドレス,大学,学部
                    </div>
                    <p className="text-sm text-gray-600">
                      同じメールアドレスの学生が既に存在する場合、名前・大学・学部・ATS IDが更新されます（視聴履歴は保持されます）
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              {/* サンプルダウンロード */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                <div>
                  <div className="font-medium">サンプルCSVをダウンロード</div>
                  <div className="text-sm text-gray-600">フォーマットの参考にしてください</div>
                </div>
                <Button variant="outline" onClick={downloadSampleCSV}>
                  <FileText className="h-4 w-4 mr-2" />
                  ダウンロード
                </Button>
              </div>

              {/* ファイルアップロード */}
              <div className="space-y-2">
                <Label htmlFor="csv-upload">CSVファイルを選択 *</Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="cursor-pointer"
                  disabled={isUploading}
                />
                {csvFile && (
                  <div className="text-sm text-green-600 flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
                  </div>
                )}
                {error && (
                  <div className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
              </div>

              {/* アップロードボタン */}
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={!csvFile || isUploading || false}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? "取り込み中..." : "アップロードして追加"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                >
                  キャンセル
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

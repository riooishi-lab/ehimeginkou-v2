# Vercel へのデプロイ手順（完全無料）

Vercel の Hobby プランを使用することで、個人開発や小規模なプロジェクトであれば無料でインターネット上に公開できます。

## 1. Vercel CLI のインストール
ターミナルで以下のコマンドを実行してください。
```bash
npm install -g vercel
```

## 2. Vercel へのログイン
ブラウザが開くので、案内を参考にログインしてください。
```bash
vercel login
```

## 3. プロジェクトのデプロイ
プロジェクトのルートディレクトリで以下のコマンドを実行します。
```bash
vercel
```
- `Set up and deploy ...?` -> `y`
- `Which scope ...?` -> `[自分の名前]`
- `Link to existing project?` -> `n` (新規作成)
- `What's your project's name?` -> `saiyo-analysis-tool` (など好きな名前)
- `In which directory ...?` -> `./`
- `Want to modify settings?` -> `n`

これでデプロイが完了し、`Preview` の URL が発行されます。

## 4. SPA ルーティング設定 (既に対応済み)
このアプリは `/watch` という特殊なパスを使用しているため、ブラウザでページを更新した際に 404 エラーにならないよう `vercel.json` という設定ファイルを作成しました。これにより、どのパスにアクセスしても正しくアプリが表示されるようになります。

## 5. 環境変数の設定 (重要)

これで発行された URL から、スマホや他の端末でも同じようにアプリが動くようになります。

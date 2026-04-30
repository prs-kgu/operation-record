# operation-record
鹿児島大学形成外科の手術記録のフォーマット

## 開発環境

このリポジトリは、Tailwind CSS CLI を使用してスタイルをビルドする構成になっています。サーバーを立てることなく、ローカルファイルを直接ブラウザで開いて使用可能です。

### 使い方

1. 依存パッケージをインストール
初めて使用する場合は、Node.js 環境で以下を実行してください。

```bash
npm install
```

2. CSS のビルド（開発時）
HTML やスタイルの変更をリアルタイムで反映させるために、以下のコマンドを実行したままにします。

```bash
npm run dev
```

3. ブラウザで表示

プロジェクトフォルダにある index.html をブラウザにドラッグ＆ドロップして開いてください。

### ビルド
配布・公開用に CSS ファイルを最適化（圧縮）する場合は以下を実行します。

```bash
npm run build
```

### 変更点

- `index.html` を開発用エントリーポイントとして追加
- `src/style.css` にスタイルを分離
- `src/main.js` に JavaScript ロジックを分離
- `src/config.js` に JavaScript 定数を分離
- `package.json` と `.gitignore` を追加

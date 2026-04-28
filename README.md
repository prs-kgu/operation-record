# operation-record
鹿児島大学形成外科の手術記録のフォーマット

## 開発環境

このリポジトリは Vite を使った軽量な静的サイトとして構成されています。

### 使い方

1. 依存パッケージをインストール

```bash
npm install
```

2. 開発サーバーを起動

```bash
npm run dev
```

3. ブラウザで表示

`http://localhost:5173` にアクセスしてください。

### ビルド

```bash
npm run build
```

### 変更点

- `index.html` を開発用エントリーポイントとして追加
- `src/style.css` にスタイルを分離
- `src/main.js` に JavaScript ロジックを分離
- `package.json` と `.gitignore` を追加

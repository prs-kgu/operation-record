# スクリプトがあるディレクトリに移動
cd "$(dirname "$0")"

echo "--- Pulling latest changes ---"
git pull origin main

# Node.jsの依存関係を更新（新しいパッケージがある場合に備えて）
echo "--- Installing dependencies ---"
npm install

# ビルド実行
echo "--- Building project ---"
npm run build

echo "--- Done! ---"
read -p "Press Enter to close..."
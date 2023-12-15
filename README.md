## 概要

`acesmeet-redash` は、[redash](https://github.com/getredash/redash)公式レポから fork したものである。

## 環境構築

- `.env` を以下の内容で作成する

```bash
REDASH_HOST=http://localhost
PYTHONUNBUFFERED=0
REDASH_LOG_LEVEL=INFO
REDASH_REDIS_URL=redis://redis:6379/0
REDASH_DATABASE_URL=postgresql://postgres@postgres/postgres
POSTGRES_PASSWORD=
POSTGRES_HOST_AUTH_METHOD=trust
REDASH_COOKIE_SECRET=redash-hands-on
REDASH_SECRET_KEY=redash-hands-on
```

- フロント側をビルドするため、node `16.20.1`, yarn をインストールしておく

```bash
# nodenv の場合
nodenv install 16.20.1
npm install -g yarn
```

- パッケージをインストールする

```bash
# [Apple Silicon Mac 向けの対応]
# e2e テストで Puppeteer が使われており、Puppeteer のインストールと同時に chromium-binary をインストールしようとするが、
# arm64 では提供されていないため、パッケージをインストールしようとするとエラーが発生する。
# そのため、ローカルで環境構築する場合は Puppeteer のインストールをスキップする
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
yarn --frozen-lockfile
```

- UI をビルドする

```bash
yarn build
```

- 先に Redash のメタデータを保存するための DB を作成し、サーバー側のコンテナを起動する

```bash
docker compose run --rm server create_db
docker compose up
```

- http://localhost:5001 にアクセスする

## デプロイ方法

- sandbox 環境
  - `feeature/sandbox` ブランチにプッシュする
- production 環境, staging 環境
  - （コードが `master` にマージされている状態で）Actions の `Push app image to Amazon ECR (production)` をクリックし、`Run workflow` を実行する

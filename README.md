# Chemical Equilibrium Simulator

高校化学の「化学平衡」と「ルシャトリエの原理」を、粒子アニメーションと濃度-時間グラフで同時に観察するための静的 Web 教材です。

## Features

- 4 種類の可逆反応プリセット
- 温度、体積、触媒、物質の追加・除去による平衡移動
- 容器ビュー、濃度-時間グラフ、学習パネルの連動
- 日本語 / 英語切替
- ライト / ダークテーマ
- GitHub Pages 向けの Vite 構成

## Stack

- React
- TypeScript
- Vite

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

GitHub Actions で `main` への push を契機に GitHub Pages へデプロイします。`vite.config.ts` は GitHub Actions 実行時にリポジトリ名から `base` を自動設定します。

# Chemical Equilibrium Simulator

高校化学の「化学平衡」と「ルシャトリエの原理」を、粒子アニメーションと濃度-時間グラフで同時に観察するための静的 Web 教材です。

## Demo

- Live demo: https://takayuki-minagawa.github.io/chemical-equilibrium-sim/
- Repository: https://github.com/Takayuki-Minagawa/chemical-equilibrium-sim

## Features

- 4 種類の可逆反応プリセット（カードで選択、性質タグ付き）
- 温度、体積、触媒、物質の追加・除去による平衡移動（ワンクリックの加熱・冷却・圧縮・膨張）
- 反応式の矢印・Q と K のメーター・正逆反応速度の「綱引き」バーで平衡の向きを可視化
- 温度で粒子の動きが変わり、ピストンで容器が縮む容器ビュー
- 容器ビュー、濃度-時間グラフ、学習パネル（正誤フィードバック付きクイズ）の連動
- 操作を試すと達成される「実験ミッション」（進捗はブラウザに保存）
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

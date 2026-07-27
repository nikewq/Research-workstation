#!/bin/bash
# 把仓库根目录的网页版静态资源同步进 Capacitor 的 www/，供 native 打包使用。
# 每次 index.html/sw.js/manifest.json/icons 有更新时重跑一次即可。
set -e
cd "$(dirname "$0")"
ROOT="../"
rm -rf www
mkdir -p www
cp "$ROOT/index.html" www/
cp "$ROOT/manifest.json" www/
cp -R "$ROOT/icons" www/
echo "✅ synced web assets into mobile/www/"

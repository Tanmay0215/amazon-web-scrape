#!/usr/bin/env bash
set -e

npm install

PUPPETEER_CACHE_DIR="/opt/render/.cache/puppeteer"
mkdir -p $PUPPETEER_CACHE_DIR

if [[ ! -d $PUPPETEER_CACHE_DIR ]]; then
  echo "Copying Puppeteer Cache from Build Cache"
  cp -R /opt/render/project/src/.cache/puppeteer/ $PUPPETEER_CACHE_DIR
else
  echo "Storing Puppeteer Cache in Build Cache"
  cp -R $PUPPETEER_CACHE_DIR /opt/render/project/src/.cache/puppeteer/
fi

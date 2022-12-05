#!/bin/node

const axios = require('axios');
const klaw = require('klaw');
const fs = require('fs-extra');
const path = require('path');
const sequence = require('promise-sequence');
const sharp = require('sharp');

const AUDIO_DB_KEY = '195003';

const JSON_OPTIONS = {
  headers: {
    'Content-Type': 'application/json; charset=shift-jis',
    'Access-Control-Allow-Origin': '*',
    'accept-encoding': null,
    proxy: false,
    responseType: 'arraybuffer',
    responseEncoding: 'binary',
    gzip: true,
    encoding: null,
  },
};

async function getFiles() {
  const items = [];
  const rootDir = path.resolve('.');

  return new Promise((resolve, reject) => {
    klaw(rootDir, { depthLimit: 0 })
      .on('data', (item) => {
        if (item.stats.isDirectory()) {
          const relPath = item.path.substring(rootDir.length + 1);
          if (relPath !== '') items.push({ ...item, name: relPath });
        }
      })
      .on('end', () => {
        resolve(items);
      })
      .on('error', reject);
  });
}

async function getArt(artist) {
  return new Promise((resolve, reject) => {
    axios
      .get(
        `https://www.theaudiodb.com/api/v1/json/${AUDIO_DB_KEY}/search.php?s=${encodeURIComponent(
          artist
        )}`,
        JSON_OPTIONS
      )
      .then((res) => {
        const artist = res.data?.artists?.[0];
        const data = artist
          ? {
              primary: artist.strArtistThumb || null,
              banner: artist.strArtistBanner || null,
              backdrop: [
                artist.strArtistFanart || null,
                artist.strArtistFanart2 || null,
                artist.strArtistFanart3 || null,
                artist.strArtistFanart4 || null,
              ].filter((i) => i !== null),
            }
          : null;

        setTimeout(() => resolve(data), 1000);
      })
      .catch((e) => reject(e));
  });
}

async function saveArt(src, dest) {
  console.log('SAVE', src, dest);
  const input = (await axios({ url: src, responseType: 'arraybuffer' })).data;
  await sharp(input).jpeg({ quality: 100 }).toFile(dest);
}

async function setArt(name, dest) {
  const primaryPath = path.resolve(dest, 'poster.jpg');
  const backdropPath = path.resolve(dest, 'backdrop.jpg');

  const hasPrimary = await fs.pathExists(primaryPath);
  const hasBackdrop = await fs.pathExists(backdropPath);

  if (!hasPrimary || !hasBackdrop) {
    const art = await getArt(name);
    if (art) {
      if (!hasPrimary) {
        if (art.primary) {
          await saveArt(art.primary, primaryPath);
        } else {
          console.log('MISSING - primary', name);
        }
      }

      if (!hasBackdrop) {
        if (art.backdrop[0]) {
          await saveArt(art.backdrop[0], backdropPath);
        } else {
          console.log('MISSING - backdrop', name);
        }
      }
    }
  } else {
    console.log(`OK ${name}`);
  }
}

async function run() {
  const files = await getFiles();
  await sequence(files.map((file) => () => setArt(file.name, file.path)));
}

run();

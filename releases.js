#!/bin/node

const klaw = require('klaw');
const fs = require('fs-extra');
const path = require('path');

const mbApi = require('./musicbrainz');

async function getDirectories(rootDir = '.') {
  const items = [];
  const _rootDir = path.resolve(rootDir);

  return new Promise((resolve, reject) => {
    klaw(_rootDir, { depthLimit: 0 })
      .on('data', (item) => {
        if (item.stats.isDirectory()) {
          const relPath = item.path.substring(_rootDir.length + 1);
          if (relPath !== '') items.push({ ...item, name: relPath });
        }
      })
      .on('end', () => {
        resolve(items);
      })
      .on('error', reject);
  });
}

async function getMbId(rootDir) {
  const mbidOPath = path.resolve(rootDir, 'mbid');
  if (await fs.pathExists(mbidOPath)) {
    return (await fs.readFile(mbidOPath, 'utf-8')).trim();
  } else {
    return null;
  }
}

async function run() {
  const artists = await getDirectories();

  let done = 0;
  for (const artist of artists) {
    done++;

    console.log('Artist', done, 'of', artists.length);

    if (artist.name === 'Various Artists') continue;

    const artistMbId = await getMbId(artist.path);
    if (artistMbId === null) {
      console.log('missing artist mbid:', artist.path);
    } else {
      const artistInfo = await mbApi.lookupArtist(artistMbId, [
        'release-groups',
      ]);

      if (!artistInfo) {
        console.log('failed to lookup artist:', artist.path, artistMbId);
      } else {
        const albums = await getDirectories(artist.path);
        const releaseGroups = [];
        for (const album of albums) {
          const albumMbId = await getMbId(album.path);
          if (albumMbId === null) {
            console.log('missing artist mbid:', artist.path);
          } else {
            const releaseInfo = await mbApi.lookupRelease(albumMbId, [
              'release-groups',
            ]);
            if (!releaseInfo) {
              console.log('failed to lookup release:', album.path, albumMbId);
            } else {
              const releaseGroupId = releaseInfo['release-group']?.id;
              if (!releaseGroupId) {
                console.log('missing release group id:', album.path, albumMbId);
              } else {
                releaseGroups.push(releaseGroupId);
              }
            }
          }
        }

        const artistReleaseGroups = artistInfo['release-groups'].filter(
          (rg) => rg['primary-type'] === 'Album'
        );

        const missingArtistReleaseGroups = artistReleaseGroups.filter(
          (rg) =>
            !releaseGroups.includes(rg.id) &&
            !(rg['secondary-types'] || []).length &&
            !(rg['secondary-type-ids'] || []).length &&
            (rg['first-release-date'] || '').length
        );

        if (missingArtistReleaseGroups.length) {
          console.log('MISSING', artist.name);
          console.log(missingArtistReleaseGroups);
        }
      }
    }
  }
  // await sequence(files.map((file) => () => setArt(file.name, file.path)));
}

run();

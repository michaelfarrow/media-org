import path from 'path';
import fs from 'fs-extra';
import { type Dir, type File, getDirs, getFileTypes } from './lib/fs';
import { dirName, fileName } from './lib/namer';
import writeTags from './lib/write-aac-metadata';
import { confirm } from './lib/ui';
import { audioFileBitDepth } from './lib/audio';

import {
  MUSIC_LOSSESS_DIR,
  MUSIC_LOSSESS_NEW_DIR,
  MUSIC_COMPRESSED_DIR,
} from './lib/config';

let total = 0;
let duds = 0;

const COPY_FILES_ARTIST = ['backdrop.jpg', 'poster.jpg', 'mbid'];

const COPY_FILES_ALBUM = [
  'cover.full.jpg',
  'cover.undersized.jpg',
  'cover.jpg',
  'mbid',
  'src-mp3',
  'src-possible-mp3',
];

type Artist = Dir;

type Album = Dir & {
  artist: Artist;
};

type Track = File;

type AlbumWithTracks = Album & {
  tracks: Track[];
};

function normalise(str: string) {
  return str
    .toLowerCase()
    .replace(/^(\d+-)?\d+\s*/g, '')
    .replace(/…/g, '...')
    .replace(/&/g, 'and')
    .replace(/\+/g, 'and')
    .replace(/’/g, "'")
    .replace(/-/g, ' ')
    .replace(
      /\([^\)]*(version|radio|session|sessions|alt|alternate|acoustic|demo|live|feat|performed|remix|mix|with|instrumental|reprise)[^\)]*\)/g,
      ''
    )
    .replace(/\.[^/.]+$/g, '')
    .replace(/[\.\?\:\_,\[\]]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normaliseTracks(items: Track[]) {
  return items.map((item) => ({
    ...item,
    nameNormalised: normalise(item.name),
  }));
}

function getAudioFiles(dir: string): Promise<Track[]> {
  return getFileTypes(dir, 'm4a');
}

async function trackCountsMatch(tracks: Track[], losslessTracks: Track[]) {
  return tracks.length == losslessTracks.length;
}

async function trackBitDepthsValid(tracks: Track[]) {
  let pass = true;
  for (const track of tracks) {
    if ((await audioFileBitDepth(track.path)) === 16) {
      pass = false;
      break;
    }
  }
  return pass;
}

async function diffTrackNames(tracks: Track[], losslessTracks: Track[]) {
  const _tracks = normaliseTracks(tracks);
  const _losslessTracks = normaliseTracks(losslessTracks);

  const normalised = _tracks.map((track, i) => {
    const trackName = fileName(track.nameNormalised);
    const losslessTrackName = fileName(_losslessTracks[i].nameNormalised);

    return {
      track: trackName,
      lossless: losslessTrackName,
      diff: trackName !== losslessTrackName,
    };
  });

  const failed = normalised.filter((item) => item.track !== item.lossless);

  if (failed.length) {
    return { failed, failedFiltered: failed.filter((item) => item.diff) };
  }

  return false;
}

// function convertToFlac(track: Track, dest: string) {
//   return new Promise((resolve, reject) => {
//     ffmpeg(track.path)
//       .audioCodec('flac')
//       .on('error', function (err) {
//         reject(err);
//       })
//       .on('end', resolve)
//       .save(`${dest.replace(/\.[^/.]+$/g, '')}.flac`);
//   });
// }

async function processAlbum(album: Album) {
  total++;

  const namePartsArtist = [dirName(album.artist.name)];
  const namePartsFull = [dirName(album.artist.name), dirName(album.name)];

  const destDir = path.resolve(MUSIC_LOSSESS_NEW_DIR, ...namePartsFull);
  const losslessDir = path.resolve(MUSIC_LOSSESS_DIR, ...namePartsFull);

  const tracks = await getAudioFiles(album.path);

  const destTracks =
    ((await fs.exists(destDir)) && (await getAudioFiles(destDir))) || [];

  if (destTracks.length == tracks.length) {
    return;
  }

  console.log('');
  console.log('Processing', album);

  const losslessExists = await fs.exists(losslessDir);

  if (losslessExists) {
    let valid = true;

    const losslessTracks = await getAudioFiles(losslessDir);

    if (!(await trackCountsMatch(tracks, losslessTracks))) {
      duds++;
      return console.log('Mismatched track counts');
    }

    if (!(await trackBitDepthsValid(losslessTracks))) {
      duds++;
      return console.log('Invalid bit depth');
    }

    const diff = await diffTrackNames(tracks, losslessTracks);

    if (diff) {
      const diffCount = diff.failedFiltered.length;
      console.log(
        `${diffCount} track name${diffCount !== 1 ? 's' : ''} different`
      );
      console.log(diff.failedFiltered);
      valid = false;
      // valid = await confirm('Valid?');
    }

    if (valid) {
      await fs.ensureDir(destDir);

      for (let i = 0; i < losslessTracks.length; i++) {
        const losslessTrack = losslessTracks[i];
        const track = tracks[i];

        const src = losslessTrack.path;
        const dest = path.resolve(
          MUSIC_LOSSESS_NEW_DIR,
          ...namePartsFull,
          fileName(track.name)
        );

        console.log('Copying and Clearing tags', src, '>', dest);
        // await fs.copy(src, dest);
        // await convertToFlac(losslessTrack, dest);
        await fs.remove(dest);
        await writeTags(src, {}, dest, {
          debug: false,
          clear: true,
        });
      }

      for (const copyFile of COPY_FILES_ALBUM) {
        const src = path.resolve(album.path, copyFile);
        const dest = path.resolve(
          MUSIC_LOSSESS_NEW_DIR,
          ...namePartsFull,
          copyFile
        );
        if (await fs.exists(src)) {
          console.log('Copying', src, '>', dest);
          await fs.copyFile(src, dest);
        }
      }

      for (const copyFile of COPY_FILES_ARTIST) {
        const src = path.resolve(album.artist.path, copyFile);
        const dest = path.resolve(
          MUSIC_LOSSESS_NEW_DIR,
          ...namePartsArtist,
          copyFile
        );
        if ((await fs.exists(src)) && !(await fs.exists(dest))) {
          console.log('Copying', src, '>', dest);
          await fs.copyFile(src, dest);
        }
      }
    } else {
      duds++;
    }
  } else {
    duds++;
    console.log('Missing', losslessDir);
  }
}

async function processArtist(artist: Artist) {
  const albums = await getDirs(artist.path);

  for (const album of albums) {
    await processAlbum({ ...album, artist });
  }
}

async function processArtists() {
  const artists = await getDirs(MUSIC_COMPRESSED_DIR);

  for (const artist of artists) {
    await processArtist(artist);
    // if (artist.name === 'Coheed and Cambria') await processArtist(artist);
  }
}

async function main() {
  await processArtists();
  console.log(`${duds}/${total} remaining`);

  // console.log(
  //   normalise(
  //     "atom heart mother_ a) father's shout b) breast milky c) mother fore d) funky dung e) mind your throats please f) remergence"
  //   )
  // );
}

main();

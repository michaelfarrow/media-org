import path from 'path';
import fs from 'fs-extra';
import { RELEASE_FILE, COVER_FILES_TO_CONVERT, COVER_FILE } from '@/lib/config';
import { type File, getFileTypes } from '@/lib/fs';
import { confirm } from '@/lib/ui';
import { Release, releasePath, trackFileName } from '@/lib/namer';
import { convertToM4a } from '@/lib/audio';
import { diffWords } from 'diff';
import colors from 'colors';
import sharp from 'sharp';

export interface Options {
  skipComplete?: boolean;
}

const COVER_RESIZE = 1417;

async function convertCoverFile(src: string, dest: string) {
  for (const copyFile of COVER_FILES_TO_CONVERT) {
    const fileSrc = path.resolve(src, copyFile);
    const fileDest = path.resolve(dest, COVER_FILE);
    if (await fs.exists(fileSrc)) {
      // TODO: check cover sizing
      console.log('Converting', fileSrc, '>', fileDest);

      const cover = sharp(fileSrc).jpeg({ quality: 85 });
      const coverMeta = await cover.metadata();

      if (!coverMeta.width || !coverMeta.height) {
        if (
          !(await confirm('Cannot read cover width and/or height, continue?'))
        )
          return false;
      }

      const size = Math.min(
        coverMeta.width || COVER_RESIZE,
        coverMeta.height || COVER_RESIZE,
        COVER_RESIZE
      );

      cover.resize(size, size, { fit: 'fill' });
      await cover.toFile(fileDest);

      break;
    }
  }
}

// Warn if anything is to be overriden
// Move / rename items if required

async function processTracks(
  files: File[],
  release: Release,
  releaseDest: string
) {
  const discs = release.discs;
  const discCount = discs.length;

  for (var discNumber = 0; discNumber < discs.length; discNumber++) {
    const disc = discs[discNumber];

    for (var trackNumber = 0; trackNumber < disc.length; trackNumber++) {
      const track = disc[trackNumber];
      const file = files.shift();

      if (!file) throw new Error('Ran out of files');

      const trackSrc = file.path;
      const trackDest = path.resolve(
        releaseDest,
        `${trackFileName(release, discNumber, trackNumber)}.m4a`
      );

      await convertToM4a(trackSrc, trackDest, {
        bitRate: 320,
        // cover: coverFile,
        tags: {
          artist: track.artists.join('; '),
          album_artist: release.artist,
          title: track.title,
          album: release.title,
          date: release.year,
          track: trackNumber + 1,
          disc: discCount > 1 ? discNumber + 1 : undefined,
        },
      });
    }
  }
}

export default async function compress(
  src: string,
  dest: string,
  options: Options = {}
) {
  const { skipComplete } = options;

  const releaseFile = path.resolve(src, RELEASE_FILE);

  if (!(await fs.exists(src)))
    throw new Error(`Source directory does not exist: ${src}`);

  if (!(await fs.exists(releaseFile)))
    throw new Error(`Release file does not exist: ${releaseFile}`);

  let foundCover = false;
  for (const file of COVER_FILES_TO_CONVERT) {
    if (await fs.exists(path.resolve(src, file))) {
      foundCover = true;
      break;
    }
  }

  if (!foundCover) {
    console.log(`Cover file not found`);
    return false;
  }

  const release = Release.parse(await fs.readJson(releaseFile));
  const releaseDest = path.resolve(dest, releasePath(release));

  const files = await getFileTypes(src, 'm4a', { sort: 'asc' });
  const discs = release.discs;
  const trackCount = discs.flat().length;

  if (trackCount !== files.length)
    throw new Error('File/track length mismatch');

  if (await fs.exists(releaseDest)) {
    const existingFiles = await getFileTypes(releaseDest, 'm4a', {
      sort: 'asc',
    });

    const existingFileNames = existingFiles.map((file) => file.nameWithoutExt);

    const newFileNames = discs
      .map((tracks, discNumber) => {
        return tracks.map(({}, trackNumber) =>
          trackFileName(release, discNumber, trackNumber)
        );
      })
      .flat();

    const different =
      JSON.stringify(existingFileNames) !== JSON.stringify(newFileNames);

    if (different) {
      for (
        let i = 0;
        i < Math.max(existingFileNames.length, newFileNames.length);
        i++
      ) {
        const existingFileName = existingFileNames[i] || '';
        const newFileName = newFileNames[i] || '';

        const fileNameDiff = diffWords(existingFileName, newFileName);

        fileNameDiff.forEach((part) => {
          const text = part.added
            ? colors.bgGreen(part.value)
            : part.removed
            ? colors.bgRed(part.value)
            : part.value;
          process.stdout.write(text);
        });

        process.stdout.write('\n');
      }
    }

    if (
      (!different && skipComplete) ||
      !(await confirm(
        `Destination already exists (${releaseDest}), erase/overwrite?`
      ))
    )
      return false;

    await fs.remove(releaseDest);
  }

  await fs.ensureDir(releaseDest);
  await processTracks(files, release, releaseDest);
  await convertCoverFile(src, releaseDest);

  return releaseDest;
}

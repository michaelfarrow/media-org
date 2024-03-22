import path from 'path';
import fs from 'fs-extra';
import { RELEASE_FILE, COVER_FILE } from '@/lib/config';
import { type File, getFileTypes } from '@/lib/fs';
import { confirm } from '@/lib/ui';
import { Release, releasePath, trackFileName } from '@/lib/namer';
import { convertToM4a } from '@/lib/audio';
import { diffWords } from 'diff';
import colors from 'colors';

export interface Options {
  skipComplete?: boolean;
}

// Warn if anything is to be overriden
// Move / rename items if required

async function processTracks(
  files: File[],
  release: Release,
  releaseDest: string,
  coverFile: string
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
        bitRate: 256,
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

  const coverFileDest = path.resolve(releaseDest, COVER_FILE);

  console.log('Copying', coverFile, '>', coverFileDest);
  await fs.copyFile(coverFile, coverFileDest);
}

export default async function compress(
  src: string,
  dest: string,
  options: Options = {}
) {
  const { skipComplete } = options;

  const coverFile = path.resolve(src, COVER_FILE);
  const releaseFile = path.resolve(src, RELEASE_FILE);

  if (!(await fs.exists(src)))
    throw new Error(`Source directory does not exist: ${src}`);

  if (!(await fs.exists(releaseFile)))
    throw new Error(`Release file does not exist: ${releaseFile}`);

  if (!(await fs.exists(coverFile)))
    throw new Error(`Cover file does not exist: ${coverFile}`);

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
  await processTracks(files, release, releaseDest, coverFile);

  return releaseDest;
}

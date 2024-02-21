import path from 'path';
import fs from 'fs-extra';
import { getFileTypes } from '@/lib/fs';
import { confirm } from '@/lib/ui';
import { Release, releasePath, trackFileName } from '@/lib/namer';
import { convertToM4a } from '@/lib/audio';

// Warn if anything is to be overriden
// Move / rename items if required

export default async function compress(src: string, dest: string) {
  const coverFile = path.resolve(src, 'cover.jpg');
  const releaseFile = path.resolve(src, 'release.json');

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
  const discCount = discs.length;
  const trackCount = discs.flat().length;

  if (trackCount !== files.length)
    throw new Error('File/track length mismatch');

  if (await fs.exists(releaseDest)) {
    if (
      !(await confirm(
        `Destination already exists (${releaseDest}), erase/overwrite?`
      ))
    ) {
      return false;
    }
    await fs.remove(releaseDest);
  }

  await fs.ensureDir(releaseDest);

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
        cover: coverFile,
        tags: {
          artist: track.artists.join('; '),
          album_artist: release.artist,
          title: track.title,
          album: release.title,
          date: release.year,
          // genre: release.genres.join(', '),
          track: trackNumber + 1,
          disc: discCount > 1 ? discNumber + 1 : undefined,
          // coverPicturePath: 'cover.embed.jpg',
        },
      });
    }
  }
}

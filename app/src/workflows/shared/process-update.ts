import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';
import {
  RELEASE_FILE,
  COVER_FILE,
  COVER_FILES,
  COVER_FILES_TO_CONVERT,
  SOURCE_FLAG_FILES,
} from '@/lib/config';
import { type File } from '@/lib/fs';
import {
  type GroupedFiles,
  type Release,
  releasePath,
  trackFileName,
  getReleaseFiles,
  getMbData,
  compareFiles,
  logTracks,
  logDiscs,
} from '@/lib/namer';
import { confirm } from '@/lib/ui';

const COVER_RESIZE = 1417;

export type ProcessTrack = (track: File, dest: string) => Promise<boolean>;

export interface Options {
  mbId: string;
  processTrack: ProcessTrack;
  postProcess?: (dest: string) => Promise<void>;
  releaseExts?: string[];
}

async function copyFiles(src: string, dest: string, files: string[]) {
  for (const copyFile of files) {
    const fileSrc = path.resolve(src, copyFile);
    const fileDest = path.resolve(dest, copyFile);

    if (fileSrc !== fileDest && (await fs.exists(fileSrc))) {
      console.log('Copying', fileSrc, '>', fileDest);
      await fs.copyFile(fileSrc, fileDest);
    }
  }
}

async function convertCoverFile(dir: string) {
  for (const copyFile of COVER_FILES_TO_CONVERT) {
    const fileSrc = path.resolve(dir, copyFile);
    const fileDest = path.resolve(dir, COVER_FILE);
    if (await fs.exists(fileSrc)) {
      // TODO: check cover sizing
      console.log('Converting', fileSrc, '>', fileDest);

      const cover = sharp(fileSrc).jpeg({ quality: 100 });
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

async function processTracks(
  files: GroupedFiles[],
  release: Release,
  dest: string,
  processTrack: ProcessTrack
) {
  for (var groupNumber = 0; groupNumber < files.length; groupNumber++) {
    const group = files[groupNumber];

    for (var fileNumber = 0; fileNumber < group.files.length; fileNumber++) {
      const track = group.files[fileNumber];

      const trackDest = path.resolve(
        dest,
        `${trackFileName(release, groupNumber, fileNumber)}.m4a`
      );

      await processTrack(track, trackDest);
    }
  }
}

async function outputInfoFile(release: Release, dest: string) {
  const infoDest = path.resolve(dest, RELEASE_FILE);
  console.log('Saving', infoDest);
  await fs.writeJSON(infoDest, release, { spaces: 2 });
}

export default async function processUpdate(
  src: string,
  dest: string,
  options: Options
) {
  const { mbId, releaseExts, processTrack, postProcess } = options;

  const files = await getReleaseFiles(src, releaseExts);
  const release = await getMbData(mbId);

  if (!files || !files.length) {
    console.log('No audio files found');
    return false;
  }

  if (!release) {
    console.log(`Release not found: ${mbId}`);
    return false;
  }

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

  const similarity = compareFiles(files, release);

  if (similarity === false) throw new Error('Track count does not match');
  if (similarity !== true) {
    console.log('Tracks do not look alike, please review:');
    console.log('');
    // console.log('Similarity:');
    // console.log(
    //   similarity.map((disc) => disc.map((s, i) => `${i + 1} - ${s}`))
    // );
    // logTracks(files);
    // logDiscs(release.discs);

    for (let i = 0; i < similarity.length; i++) {
      for (let j = 0; j < similarity[i].length; j++) {
        const s = similarity[i][j];
        if (s !== 1) {
          console.log(
            `${i + 1}-${j + 1}: ${files[i].files[j].nameWithoutExt} > ${
              release.discs[i][j].title
            }`,
            s
          );
        }
      }
    }

    console.log('');

    if (!(await confirm('Continue?'))) return false;
  }

  const srcDest = path.resolve(src);
  const releaseDest = path.resolve(dest, releasePath(release));
  const sameSrcDest = srcDest === releaseDest;

  if (await fs.exists(releaseDest)) {
    if (
      !sameSrcDest &&
      !(await confirm(
        `Destination already exists (${releaseDest}), erase/overwrite?`
      ))
    ) {
      return false;
    }
    !sameSrcDest && (await fs.remove(releaseDest));
  }

  await fs.ensureDir(releaseDest);
  await processTracks(files, release, releaseDest, processTrack);
  await copyFiles(src, releaseDest, COVER_FILES);
  await copyFiles(src, releaseDest, SOURCE_FLAG_FILES);
  await convertCoverFile(releaseDest);
  await outputInfoFile(release, releaseDest);

  postProcess && (await postProcess(releaseDest));

  return releaseDest;
}

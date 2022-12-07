import { ChildProcess, spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import Options from './Options';
import DefaultOptions from './DefaultOptions';
import Metadata from './Metadata';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';
import { utimes } from 'utimes';

/**
 *
 * @param inputFilePath The fully qualified path to the file that will have its metadata changed
 * @param metadata The metadata to update, anything that's set to undefined will not be changed and the current value kept
 * @param outputFilePath The output name of the file, pass undefined or empy string if you want to keep the file name the same
 * @param options
 */
export default async (
  inputFilePath: string,
  metadata: Metadata,
  outputFilePath?: string,
  options?: Options
) => {
  const opt = { ...DefaultOptions, ...options };
  const args = ['-i'];
  const coverPicturePath = metadata.coverPicturePath
    ? metadata.coverPicturePath
    : '';
  let ffmpegFileOutputPath = outputFilePath ?? '';

  if (!fs.existsSync(inputFilePath)) {
    throw new Error(`${inputFilePath}: file does not exist`);
  }

  if (!outputFilePath) {
    outputFilePath = inputFilePath;
    ffmpegFileOutputPath = inputFilePath;
  }

  if (fs.existsSync(outputFilePath)) {
    if (
      path.normalize(inputFilePath).toLowerCase() ===
      path.normalize(outputFilePath).toLowerCase()
    ) {
      const parsed = path.parse(outputFilePath);

      ffmpegFileOutputPath = path.join(
        parsed.dir,
        `${parsed.name}-${uuid()}${parsed.ext}`
      );
    } else {
      throw new Error(`${outputFilePath}: file already exists`);
    }
  }

  if (opt.debug) {
    // eslint-disable-next-line no-console
    console.debug('filePath:', inputFilePath);
    // eslint-disable-next-line no-console
    console.debug('outputFilePath:', outputFilePath);

    if (ffmpegFileOutputPath !== outputFilePath) {
      // eslint-disable-next-line no-console
      console.debug('ffmpegFileOutputPath', ffmpegFileOutputPath);
    }

    // eslint-disable-next-line no-console
    console.debug('metadata:', metadata);
    // eslint-disable-next-line no-console
    console.debug('Applied Options:', opt);
  }

  args.push(`"${inputFilePath.replace(/"/g, '\\"')}}"`);

  if (coverPicturePath) {
    args.push('-i', `"${coverPicturePath}"`);
  }

  if (coverPicturePath) {
    args.push('-map', '0:0');
    args.push('-map', '1');
  }

  args.push('-c', 'copy');

  if (coverPicturePath) {
    args.push('-disposition:v:0', 'attached_pic');
  }

  addMetaData(args, 'album', metadata.album);
  addMetaData(args, 'artist', metadata.artist);
  addMetaData(args, 'album_artist', metadata.albumArtist);
  addMetaData(args, 'grouping', metadata.grouping);
  addMetaData(args, 'composer', metadata.composer);
  addMetaData(args, 'date', metadata.year);
  addMetaData(args, 'track', metadata.track);
  addMetaData(args, 'disc', metadata.disc);
  addMetaData(args, 'comment', metadata.comment);
  addMetaData(args, 'genre', metadata.genre);
  addMetaData(args, 'copyright', metadata.copyright);
  addMetaData(args, 'description', metadata.description);
  addMetaData(args, 'synopsis', metadata.synopsis);
  addMetaData(args, 'title', metadata.title);

  args.push(`"${ffmpegFileOutputPath.replace(/"/g, '\\"')}"`);

  if (opt.debug) {
    // eslint-disable-next-line no-console
    console.debug(`Running command ${ffmpegPath} ${args.join(' ')}`);
  }

  const ffmpeg = spawn(ffmpegPath ?? '', args, {
    windowsVerbatimArguments: true,
    stdio: opt.pipeStdio ? ['pipe', process.stdout, process.stderr] : undefined,
    detached: false,
    shell: process.platform !== 'win32',
  });

  await onExit(ffmpeg);

  if (opt.debug) {
    // eslint-disable-next-line no-console
    console.debug(`Created file ${ffmpegFileOutputPath}`);
  }

  const inputFileStats = fs.statSync(inputFilePath);
  const btime = Math.round(inputFileStats.birthtimeMs);
  const atime = Math.round(inputFileStats.atimeMs);
  const mtime = Math.round(inputFileStats.mtimeMs);

  if (opt.debug) {
    // eslint-disable-next-line no-console
    console.debug(
      `Setting ${ffmpegFileOutputPath} creation date: ${new Date(
        btime
      )} (${btime}), accessed date: ${new Date(
        atime
      )} (${atime}), modified date: ${new Date(
        atime
      )} (${atime}) so it matches with the original file`
    );
  }

  await utimes(ffmpegFileOutputPath, { btime, atime, mtime });

  if (ffmpegFileOutputPath !== outputFilePath) {
    if (opt.debug) {
      // eslint-disable-next-line no-console
      console.debug(`Deleting ${outputFilePath}`);
    }

    fs.unlinkSync(outputFilePath);

    if (opt.debug) {
      // eslint-disable-next-line no-console
      console.debug(`Renaming ${ffmpegFileOutputPath} to ${outputFilePath}`);
    }

    fs.renameSync(ffmpegFileOutputPath, outputFilePath);
  }
};

function addMetaData(
  args: string[],
  key: string,
  value: string | number | undefined
) {
  if (value !== undefined) {
    let arg = value;

    if (process.platform !== 'win32') {
      arg = `'${arg.toString().replace(/'/g, "'\\''")}'`;
    } else {
      arg = `"${arg.toString().replace(/"/g, '\\"')}"`;
    }

    args.push('-metadata', `${key}=${arg}`);
  }
}

function onExit(childProcess: ChildProcess): Promise<void> {
  return new Promise((resolve, reject) => {
    childProcess.once('exit', (code) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error('Exit with error code: ' + code));
      }
    });
    /* istanbul ignore next */
    childProcess.once('error', (err: Error) => {
      // This should only happen if ffmpeg crashes so we can't really test it
      reject(err);
    });
  });
}

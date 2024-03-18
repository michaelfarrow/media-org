import ffmpeg from '@/lib/ffmpeg';
import { runFfmpegCommand, probeMediaFile, type FfmpegArg } from '@/lib/media';
import { type FfprobeData } from 'fluent-ffmpeg';

export type MetaTags = Record<string, string | number | undefined>;

export function audioStream(data: FfprobeData) {
  return data.streams.find((stream) => stream.codec_type === 'audio');
}

export function audioBitDepth(data: FfprobeData) {
  const bitDepth = String(audioStream(data)?.bits_per_raw_sample);
  return bitDepth && bitDepth.length ? Number(bitDepth) : undefined;
}

export function audioSampleRate(data: FfprobeData) {
  const sampleRate = String(audioStream(data)?.sample_rate);
  return sampleRate && sampleRate.length ? Number(sampleRate) : undefined;
}

export async function audioFileBitDepth(file: string) {
  return audioBitDepth(await probeMediaFile(file));
}

export async function audioFileSampleRate(file: string) {
  return audioSampleRate(await probeMediaFile(file));
}

export function metaTagArgs(tags?: MetaTags): FfmpegArg[] {
  if (!tags) return [];
  return Object.entries(tags)
    .filter(
      (entry): entry is [(typeof entry)[0], NonNullable<(typeof entry)[1]>] =>
        entry[1] !== undefined
    )
    .map(([key, value]) => ['-metadata', `${key}=${value}`]);
}

export function convertToAlac(
  file: string,
  dest: string,
  options: { bitDepth: number; sampleRate: number; copy?: boolean }
) {
  const actionArgs: FfmpegArg[] = options.copy
    ? [['-c:a', 'copy']]
    : [
        ['-c:a', 'alac'],
        ['-sample_fmt', `s${options.bitDepth}p`],
        ['-ar', `${options.sampleRate}`],
      ];

  return runFfmpegCommand(ffmpeg(file).output(dest), [
    ['-map', '0:a'],
    ['-map_metadata', '-1'],
    ...actionArgs,
  ]);
}

export function convertToM4a(
  file: string,
  dest: string,
  options: {
    bitRate: number;
    tags?: MetaTags;
    cover?: string;
  }
) {
  const command = ffmpeg(file);

  if (options.cover) command.input(options.cover);
  command.output(dest);

  const actionArgs: FfmpegArg[] = options.cover
    ? [
        ['-map', '1:v'],
        ['-c', 'copy'],
        ['-disposition:v:0', 'attached_pic'],
      ]
    : [];

  return runFfmpegCommand(command, [
    ['-map', '0:a'],
    ...actionArgs,
    ['-c:a', 'libfdk_aac'],
    ['-b:a', `${options.bitRate || 320}k`],
    ['-ac', '2'],
    ['-cutoff', '20000'],
    ['-vbr', '0'],
    ['-afterburner', '1'],
    ['-map_metadata', '-1'],
    ...metaTagArgs(options.tags),
  ]);
}

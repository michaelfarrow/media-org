import processUpdate from './shared/process-update';
import fs from 'fs-extra';
import { probeMediaFile } from '@/lib/media';
import { audioBitDepth, audioSampleRate, convertToAlac } from '@/lib/audio';

const BIT_DEPTH = 16;
const SAMPLE_RATE = 44100;

export default function processRaw(
  src: string,
  dest: string,
  mbId: string,
  simpleCopy?: boolean
) {
  return processUpdate(src, dest, {
    mbId,
    async processTrack(track, dest) {
      const info = await probeMediaFile(track.path);
      const bitDepth = audioBitDepth(info);
      const sampleRate = audioSampleRate(info);

      if (!bitDepth || bitDepth < BIT_DEPTH)
        throw new Error('Bit depth not high enough');

      if (!sampleRate || sampleRate < SAMPLE_RATE)
        throw new Error('Sample rate not high enough');

      const copy =
        track.ext === 'm4a' &&
        bitDepth === BIT_DEPTH &&
        sampleRate === SAMPLE_RATE;

      if (copy && simpleCopy) {
        console.log(`Copying ${track.path} > ${dest}`);
        await fs.copyFile(track.path, dest);
        return true;
      }

      await convertToAlac(track.path, dest, {
        bitDepth: BIT_DEPTH,
        sampleRate: SAMPLE_RATE,
        copy,
      });

      return true;
    },
  });
}

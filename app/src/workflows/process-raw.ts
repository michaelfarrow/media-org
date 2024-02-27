import processUpdate from './shared/process-update';
import fs from 'fs-extra';
import {
  audioBitDepth,
  audioSampleRate,
  convertToAlac,
  probeAudioFile,
} from '@/lib/audio';

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
      const info = await probeAudioFile(track.path);
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

      return await convertToAlac(track.path, dest, {
        bitDepth: BIT_DEPTH,
        sampleRate: SAMPLE_RATE,
        copy,
      });
    },
  });
}

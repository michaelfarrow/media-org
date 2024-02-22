import processUpdate from './shared/process-update';
import fs from 'fs-extra';
import {
  audioBitDepth,
  audioSampleRate,
  convertToAlac,
  probeAudioFile,
} from '@/lib/audio';

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

      if (!bitDepth || bitDepth < 16)
        throw new Error('Bit depth not high enough');

      if (!sampleRate || sampleRate < 44100)
        throw new Error('Sample rate not high enough');

      const copy =
        track.ext === 'm4a' && bitDepth === 16 && sampleRate === 44100;

      if (copy && simpleCopy) {
        console.log(`Copying ${track.path} > ${dest}`);
        await fs.copyFile(track.path, dest);
        return true;
      }

      return await convertToAlac(track.path, dest, {
        bitDepth: 16,
        sampleRate: 44100,
        copy,
      });
    },
  });
}

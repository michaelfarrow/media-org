import ffmpeg from '@/lib/ffmpeg';
import { type FfprobeData } from 'fluent-ffmpeg';

export function probeMediaFile(file: string): Promise<FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg(file).ffprobe((err, data) => {
      if (err) return reject(err);
      resolve(data);
    });
  });
}

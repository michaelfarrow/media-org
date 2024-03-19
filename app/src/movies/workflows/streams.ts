import { processMovies } from './shared/process-movies';

export default async function subtitles(src: string) {
  await processMovies(src, async ({ file, data, streams }) => {
    const { video, audio } = streams;

    console.log(file.name);
    console.log();
    console.log(
      'VIDEO',
      video.codec_name,
      `${Math.round(
        ((data.format.bit_rate || 0) -
          ((audio.bit_rate && Number(audio.bit_rate)) || 0)) /
          1000
      )}kb/s`,
      `${video.width}x${video.height}`
    );
    console.log(
      'AUDIO',
      audio.codec_name,
      `${Math.round(
        ((audio.bit_rate && Number(audio.bit_rate)) || 0) / 1000
      )}kb/s`
    );
    // sub.forEach((subStream) => {
    //   console.log('SUB', subStream);
    // });
    console.log('');
  });
}

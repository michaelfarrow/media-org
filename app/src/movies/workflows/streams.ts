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
          ((video.bit_rate && Number(video.bit_rate)) || 0)) /
          1000
      )}kb/s`,
      `${video.width}x${video.height}`
    );
    for (const stream of audio) {
      console.log(
        'AUDIO',
        stream.codec_name,
        `${Math.round(
          ((data.format.bit_rate || 0) -
            ((stream.bit_rate && Number(stream.bit_rate)) || 0)) /
            1000
        )}kb/s`
      );
    }
    // sub.forEach((subStream) => {
    //   console.log('SUB', subStream);
    // });
    console.log('');
  });
}

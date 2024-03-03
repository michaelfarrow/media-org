import { createHandler, z } from '@server/api/lib';
import musicBrainz from '@server/lib/musicbrainz';

export default createHandler(
  'post',
  z.object({ q: z.string() }),
  async (req) => {
    const res = await musicBrainz.search('artist', {
      query: req.body.q,
      limit: 100,
    });
    return {
      artists: res.artists.map((artist) => ({
        id: artist.id,
        name: artist.name,
      })),
    };
  }
);

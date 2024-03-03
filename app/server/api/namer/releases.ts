import { createHandler, z } from '@server/api/lib';
import { getPaged } from '@server/lib/data';
import musicBrainz from '@server/lib/musicbrainz';
import { orderBy } from 'natural-orderby';

export default createHandler(
  'get',
  z.object({
    artist: z.string(),
  }),
  async (req) => {
    const { artist } = req.query;

    const releases = orderBy(
      await getPaged(async ({ limit, offset }) => {
        const res = await musicBrainz.browse('release-group', {
          artist,
          limit,
          offset,
        });
        return {
          expect: res['release-group-count'],
          results: res['release-groups'],
        };
      }),
      (releaseGroup) => {
        const year = releaseGroup['first-release-date'].match(/^\d{4}/)?.[0];
        return year ? Number(year) : 0;
      }
    );

    return releases;
  }
);

import { MUSIC_LOSSESS_DIR } from '@/lib/config';
import { Release } from '@/lib/namer';
import mb from '@/lib/musicbrainz';
import { getPaged } from '@/lib/data';

import processArtists from './shared/process-artists';
import processReleases from './shared/process-releases';

const FILTER_PRIMARY_INCLUDE = ['Album']; // , 'EP'
// const FILTER_SECONDARY_EXCLUDE = [
//   'Live',
//   'Demo',
//   'Compilation',
//   'Remix',
//   'Interview',
// ];

export default async function art() {
  return processArtists(MUSIC_LOSSESS_DIR, {
    async processArtist({ artist }) {
      const releases: Release[] = [];

      await processReleases(artist, {
        async processRelease({ release, info }) {
          releases.push(info);
        },
      });

      if (!releases.length) return;

      const existingGroupIds = releases.map((release) => release.groupId);

      const artistId = releases[0].artistId;

      const artistInfo = await mb.lookup('artist', artistId, [
        'release-groups',
      ]);
      const releaseGroups = artistInfo['release-groups'] || [];

      // const releaseGroups = await getPaged(async ({ limit, offset }) => {
      //   const res = await mb.browse('release-group', {
      //     artist: artistId,
      //     limit,
      //     offset,
      //   });
      //   return {
      //     expect: res['release-group-count'],
      //     results: res['release-groups'],
      //   };
      // });

      const filteredReleaseGroups = releaseGroups.filter((releaseGroup) => {
        const primaryType = releaseGroup['primary-type'];
        const secondaryTypes = releaseGroup['secondary-types'];

        if (!FILTER_PRIMARY_INCLUDE.includes(primaryType)) return false;
        if (releaseGroup['secondary-types'].length) return false;
        if (releaseGroup['secondary-type-ids']?.length) return false;
        // for (const type of secondaryTypes) {
        //   if (FILTER_SECONDARY_EXCLUDE.includes(type)) return false;
        // }

        return true;
      });

      const missingReleaseGroups = filteredReleaseGroups
        .map((releaseGroup) => ({
          ...releaseGroup,
          year: releaseGroup['first-release-date'].match(/^\d{4}/)?.[0],
        }))
        .filter((releaseGroup) => {
          return (
            releaseGroup.year && !existingGroupIds.includes(releaseGroup.id)
          );
        });

      if (missingReleaseGroups.length) {
        console.log('Missing', releases[0].artist);
        console.log(
          missingReleaseGroups.map((rg) => `${rg.year} - ${rg.title}`)
        );
        // console.log(missingReleaseGroups.map((rg) => rg.title));

        console.log('');
      }
    },
  });
}

import mb from '@/lib/musicbrainz';
// import { getPaged } from '@/lib/data';
// import { Release } from '@/lib/namer';

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

export default async function releases(src: string, all?: boolean) {
  const currentYear = new Date().getFullYear();

  const artists = await processArtists(src);

  for (const { artist } of artists) {
    const releases = (await processReleases(artist.path))
      .map(({ info }) => info)
      .filter((info) => !!info);

    if (!releases.length) continue;

    const existingGroupIds = releases.map((release) => release.groupId);

    const artistId = releases[0].artistId;

    const artistInfo = await mb.lookup('artist', artistId, ['release-groups']);
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
      .map((releaseGroup) => {
        const year = releaseGroup['first-release-date'].match(/^\d{4}/)?.[0];
        return {
          ...releaseGroup,
          year: year && Number(year),
        };
      })
      .filter((releaseGroup) => {
        return releaseGroup.year && !existingGroupIds.includes(releaseGroup.id);
      })
      .filter((releaseGroup) => {
        if (all) return true;
        return releaseGroup.year && releaseGroup.year >= currentYear - 1;
      });

    if (missingReleaseGroups.length) {
      console.log('Missing', releases[0].artist);
      console.log(missingReleaseGroups.map((rg) => `${rg.year} - ${rg.title}`));
      // console.log(missingReleaseGroups.map((rg) => rg.title));

      console.log('');
    }
  }
}

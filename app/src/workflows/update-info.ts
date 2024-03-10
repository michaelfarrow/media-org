import { MUSIC_LOSSESS_DIR } from '@/lib/config';
import mb from '@/lib/musicbrainz';

import processArtists from './shared/process-artists';
import processReleases from './shared/process-releases';
import { outputInfoFile } from './shared/process-update';

export default async function updateInfo() {
  return processArtists(MUSIC_LOSSESS_DIR, {
    async processArtist({ artist }) {
      await processReleases(artist, {
        async processRelease({ release, info }) {
          // Lookup something new

          await outputInfoFile(
            {
              id: info.id,
              artistId: info.artistId,
              groupId: info.groupId,
              title: info.title,
              disambiguation: info.disambiguation,
              artist: info.artist,
              year: info.year,
              discs: info.discs,
            },
            release.path
          );
        },
      });
    },
  });
}

import path from 'path';
import { orderBy } from 'natural-orderby';
import { diceCoefficient } from 'dice-coefficient';
import { z } from 'zod';
import { File, getFileTypes, removeRootPath } from './fs';
import mb from './musicbrainz';

const SIMILARITY_WARNING = 0.9;

export type GroupedFiles = {
  group: string;
  files: File[];
};

export const Track = z.object({
  artists: z.array(z.string()),
  title: z.string(),
});

export type Track = z.infer<typeof Track>;

export const Release = z.object({
  id: z.string(),
  artistId: z.string(),
  title: z.string(),
  disambiguation: z.string().optional(),
  artist: z.string(),
  year: z.string(),
  discs: z.array(z.array(Track)),
});

export type Release = z.infer<typeof Release>;

export function logDiscs(discs: Release['discs']) {
  console.log(
    discs.map((disc) =>
      disc.map(
        (track, i) =>
          `${i + 1} ${track.title}${
            track.artists?.length || 0 > 1
              ? ` [${track.artists?.join(', ')}]`
              : ''
          }`
      )
    )
  );
}

export function logTracks(files: GroupedFiles[]) {
  console.log('Files:');
  console.log(files.map((dir) => dir.files.map((file) => file.nameWithoutExt)));
}

export function artistPath(artist: string) {
  return dirName(artist);
}

export function releasePath(release: Release) {
  const { title, disambiguation, artist } = release;
  return path.join(
    artistPath(artist),
    dirName(`${title}${disambiguation ? ` (${disambiguation})` : ''}`)
  );
}

export function trackFileName(
  release: Release,
  discNumber: number,
  trackNumber: number
) {
  const track: Track | undefined = release.discs?.[discNumber]?.[trackNumber];
  if (!track) return new Error('Could not find track in release');

  const discCount = release.discs.length;

  return `${discCount > 1 ? `${discNumber + 1}-` : ''}${String(
    trackNumber + 1
  ).padStart(2, '0')} ${fileName(track.title)}`;
}

export function itemName(str: string, dir?: boolean) {
  return str.replace(/[<>:\\\/\*\?"|\$]/g, '_').replace(/^\./, '_');
  // <>:\/*?"|
}

export function dirName(str: string) {
  return itemName(str, true);
}

export function fileName(str: string) {
  return itemName(str);
}

export function replaceStrangeChars(str: string) {
  return str
    .replace(/’/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐‒]/g, '-')
    .replace(/×/g, 'x');
}

export async function getMbData(id: string): Promise<Release | undefined> {
  try {
    const release = await mb.lookup('release', id, [
      'artists',
      'recordings',
      'release-groups',
      'artist-credits',
    ]);

    const releaseGroup = release['release-group'];
    const releaseArtistCredit = release['artist-credit'];

    const group =
      releaseGroup &&
      (await mb.lookup('release-group', releaseGroup.id, [
        'genres',
        'url-rels',
      ]));

    const credit =
      (releaseArtistCredit &&
        releaseArtistCredit.length &&
        (await mb.lookup(
          'artist',
          releaseArtistCredit.find((artist) => artist.joinphrase === '')?.artist
            .id || releaseArtistCredit[0].artist.id,
          ['genres', 'url-rels']
        ))) ||
      undefined;

    if (!group) throw new Error('Cannot find group');
    if (!credit) throw new Error('Cannot find artist');

    const artistName = replaceStrangeChars(credit.name);
    const albumTitle = replaceStrangeChars(release.title);

    const discs = release.media
      .filter(
        (media) =>
          media.format?.toLowerCase() ===
          release.media[0]?.format?.toLowerCase()
      )
      .map((media) =>
        media.tracks.map((track) => {
          const trackCredits = track.recording['artist-credit'];
          // const extra = trackCredits
          //   .map(
          //     (artist, i) =>
          //       `${i !== 0 ? artist.name : ''}${artist.joinphrase.replace(
          //         /&/,
          //         'with'
          //       )}`
          //   )
          //   .join('')
          //   .trim();
          return {
            artists: trackCredits?.map((credit) => {
              let name = credit.artist.name || credit.name;
              if (name === '[no artist]') name = '';
              return replaceStrangeChars(name);
            }) || [artistName],
            title: replaceStrangeChars(track.title),
          };
          /*
	title: trackTitle(
          `${replaceStrangeChars(track.title)}${
            extra.length ? ` (${extra})` : ''
          }`
        ).replace(/Feat\./g, 'feat.')}
	*/
        })
      );

    const year = group['first-release-date']?.match(/^\d{4}/)?.[0];
    const disambiguation = group.disambiguation?.trim();

    if (!year) throw new Error('Could not find/parse release year');

    // const genres = _.uniq(
    //   (group.genres && group.genres.length
    //     ? group.genres
    //     : artist.genres && artist.genres.length
    //     ? artist.genres
    //     : []
    //   ).map((genre) => genre.name.trim())
    // );

    return {
      id: release.id,
      artistId: credit.id,
      title: albumTitle,
      disambiguation: disambiguation?.length ? disambiguation : undefined,
      artist: artistName,
      year,
      // wikipedia: wikipediaRel?.url?.resource,
      // wikidata: wikidataRel?.url?.resource,
      discs,
    };
  } catch (e) {
    return undefined;
  }
}

export async function getReleaseFiles(dir: string, exts = ['m4a', 'flac']) {
  try {
    const files = await getFileTypes(dir, exts, { depth: 1 });

    const grouped: GroupedFiles[] = [];

    for (const file of files) {
      let group = removeRootPath(file.dir, dir);
      const discNumber = file.name.match(/^(\d+)-\d+/);

      if (group === '' && discNumber) {
        group = discNumber[1];
      }

      if (!grouped.find((item) => item.group === group))
        grouped.push({ group, files: [] });

      grouped.find((item) => item.group === group)?.files.push(file);
    }

    return orderBy(grouped, (item) => item.group).map((item) => ({
      ...item,
      files: orderBy(item.files, (item) => item.name),
    }));
  } catch (e) {
    return undefined;
  }
}

export function compareFiles(files: GroupedFiles[], release: Release) {
  if (
    files.length !== release.discs.length ||
    files.some(
      (grouped, i) => grouped.files.length !== release.discs[i]?.length
    )
  ) {
    return false;
  }

  const trackSimilarity = files.map((dir, i) =>
    dir.files.map((file, j) => {
      return diceCoefficient(
        file.nameWithoutExt.toLowerCase().replace(/^(\d+-)?\d+\.?\s*-?\s*/, ''),
        release.discs[i][j].title.toLowerCase()
      );
    })
  );

  const similarityWarning = trackSimilarity
    .flat()
    .some((sim) => sim < SIMILARITY_WARNING);

  if (similarityWarning) {
    return trackSimilarity;
  }

  return true;
}

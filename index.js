#!/bin/node

const MusicBrainzApi = require('musicbrainz-api').MusicBrainzApi;
const { titleCase } = require('title-case');
const _ = require('lodash');
const cheerio = require('cheerio');
const axios = require('axios');
const klaw = require('klaw');
const { orderBy } = require('natural-orderby');
const path = require('path');
const stringSimilarity = require('string-similarity');
const readline = require('readline');
const metadataWriter = require('./write-aac-metadata/dist/src').default;
const sequence = require('promise-sequence');
const fs = require('fs-extra');
const sharp = require('sharp');
const download = require('download');
const infobox = require('infobox-parser');

const mbApi = new MusicBrainzApi({
  appName: 'farrow-music-namer',
  appVersion: '0.1.0',
  appContactInfo: 'mike@farrow.io',
});

let mbUrl = process.argv[2];
const albumArtUrl = process.argv[3];

const DEST = '/opt/media/music';
const SIMILARITY_WARNING = 0.9;
const ALBUM_ART_RESIZE = 1417;
const SPECIAL_WORDS = [
  'remix',
  'mix',
  'extended',
  'original',
  'demo',
  'version',
  'edit',
  'refix',
  'acoustic',
  'live',
  'sonar',
  'interlude',
  'revision',
];

const JSON_OPTIONS = {
  headers: {
    'Content-Type': 'application/json; charset=shift-jis',
    'Access-Control-Allow-Origin': '*',
    'accept-encoding': null,
    proxy: false,
    responseType: 'arraybuffer',
    responseEncoding: 'binary',
    gzip: true,
    encoding: null,
  },
};

async function askQuestion(query) {
  if (process.env.NAMER_AUTO === 'true') return Promise.resolve();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function setMeta(file, data) {
  console.log('Setting metadata,', file, data);
  return metadataWriter(file, data, undefined, { debug: false });
}

async function copyFile(src, dest) {
  console.log('Copying file', dest);
  return fs.copy(src, dest);
}

function trackTitle(title) {
  let _title = title;

  SPECIAL_WORDS.forEach((word) => {
    _title = _title.replace(
      new RegExp(`(\\(.*?)(?<![a-z])${word}(.*?\\))`, 'ig'),
      '$1' + titleCase(word) + '$2'
    );
  });

  return _title;
}

async function getFiles() {
  const items = [];

  return new Promise((resolve, reject) => {
    klaw('.', { depthLimit: 1 })
      .on('data', (item) => {
        if (item.path.endsWith('.m4a')) {
          const dirPath = path.dirname(item.path);
          const filename = path.basename(item.path);
          const name = path.basename(item.path, path.extname(item.path));
          let group = dirPath.substring(path.resolve('.').length);
          const discNumber = name.match(/^(\d+)-\d+/);
          if (group === '' && discNumber) {
            group = discNumber[1];
          }
          if (!items.find((item) => item.group === group))
            items.push({ group, items: [] });
          items
            .find((item) => item.group === group)
            .items.push({
              ...item,
              name,
              filename,
            });
        }
      })
      .on('end', () => {
        resolve(
          orderBy(items, (item) => item.group).map((item) => ({
            ...item,
            items: orderBy(item.items, (item) => item.name),
          }))
        );
      })
      .on('error', reject);
  });
}

function replaceSpecialChars(str, dir) {
  return dir ? str.replace(/[\/\.]/g, '_') : str.replace(/[\/]/g, '_');
}

function processGenres(genres) {
  let _genres = [];

  switch (typeof genres) {
    case 'string':
      _genres = [genres];
      break;
    case 'object':
      _genres = Array.isArray(genres) ? genres : [];
      break;
  }

  return _.uniq(_genres.map((genre) => titleCase(genre)));
}

function replaceStrangeChars(str) {
  return str.replace(/’/g, "'").replace(/[‐‒]/g, '-');
}

async function getMbData(url) {
  const release = await mbApi.lookupEntity(
    'release',
    url.match(/release\/(.*?)$/)[1],
    ['artists', 'recordings', 'release-groups', 'artist-credits']
  );
  const group = await mbApi.lookupEntity(
    'release-group',
    release['release-group'].id,
    ['url-rels']
  );
  const artist = await mbApi.lookupEntity(
    'artist',
    release['artist-credit'][0].artist.id,
    ['url-rels']
  );

  const wikidataRel =
    group.relations.find((rel) => rel.type.toLowerCase() === 'wikidata') ||
    artist.relations.find((rel) => rel.type.toLowerCase() === 'wikidata');

  const artistName = replaceStrangeChars(artist.name);
  const albumTitle = replaceStrangeChars(group.title);
  const discs = release.media
    .filter(
      (media) =>
        media.format.toLowerCase() === release.media[0].format.toLowerCase()
    )
    .map((media) =>
      media.tracks.map((track) => {
        const trackArtists = track.recording['artist-credit'];
        const extra = trackArtists
          .map(
            (artist, i) =>
              `${i !== 0 ? artist.name : ''}${artist.joinphrase.replace(
                /&/,
                'with'
              )}`
          )
          .join('')
          .trim();
        return {
          artists: trackArtists.map((artist) =>
            replaceStrangeChars(artist?.artist?.name || artist.name)
          ),
          title: trackTitle(replaceStrangeChars(track.title)),
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
  const year = group['first-release-date'].match(/^\d{4}/)[0];

  return {
    id: release.id,
    release: albumTitle,
    artist: artistName,
    wikidata: wikidataRel?.url?.resource,
    discs,
    year,
  };
}

async function getWikidata(url) {
  const entity = url.match(/\/(Q\d+$)/)[1];

  return axios
    .get(
      `https://www.wikidata.org/wiki/Special:EntityData/${entity}.json`,
      JSON_OPTIONS
    )
    .then((res) => {
      return (
        res.data?.entities?.[entity]?.sitelinks?.enwiki ||
        res.data?.entities?.[Object.keys(res.data?.entities)?.[0]]?.sitelinks
          ?.enwiki
      );
    });
}

async function getInfoBox(title) {
  return axios
    .get(
      `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&format=json&titles=${encodeURIComponent(
        title
      ).replace(/\s/g, '_')}&rvsection=0`,
      JSON_OPTIONS
    )
    .then((res) => {
      const infoboxText = Object.values(res.data?.query?.pages || {})?.[0]
        ?.revisions?.[0]?.['*'];
      return infobox(infoboxText, {
        removeSmall: true,
        removeReferences: true,
      });
    });
}

async function getArtistGenres(artist) {
  try {
    const infobox = await getInfoBox(artist);
    return processGenres(infobox?.general?.genre);
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function getWikipediaData(title) {
  try {
    const infobox = await getInfoBox(title);

    const genres = processGenres(infobox?.general?.genre);
    const artistGenres = await getArtistGenres(infobox?.general?.artist);

    return {
      genres:
        genres && genres.length
          ? genres
          : artistGenres && artistGenres.length
          ? artistGenres
          : [],
    };
  } catch (e) {
    console.log(e);
    return { genres: [] };
  }
}

async function run() {
  const files = await getFiles();

  const mbIdFileExists = await fs.exists('./mbid');
  const coverUrlFileExists = await fs.exists('./cover');

  if (mbIdFileExists) {
    mbUrl = `https://musicbrainz.org/release/${(
      await fs.readFile('./mbid', 'utf-8')
    ).trim()}`;
  }

  if (albumArtUrl || coverUrlFileExists) {
    const coverUrl =
      albumArtUrl || (await fs.readFile('./cover', 'utf-8')).trim();
    console.log('Downloading cover file', coverUrl);
    await download(coverUrl, '.', { filename: 'cover.jpg' });
  }

  const fullCoverExists = await fs.exists('./cover.full.jpg');
  const undersizedCoverExists = await fs.exists('./cover.undersized.jpg');
  const coverExists = await fs.exists('./cover.jpg');

  if (!coverExists && !fullCoverExists && !undersizedCoverExists) {
    console.log('cover file does not exist');
    process.exit();
  }

  const coverFile = fullCoverExists
    ? './cover.full.jpg'
    : undersizedCoverExists
    ? './cover.undersized.jpg'
    : './cover.jpg';

  console.log('Using cover file:', coverFile);
  const cover = await sharp(coverFile).jpeg({ quality: 100 });
  const coverMeta = await cover.metadata();

  let albumArtUndersized = false;
  let albumArtOversized = false;

  if (
    coverMeta.width < ALBUM_ART_RESIZE ||
    coverMeta.height < ALBUM_ART_RESIZE
  ) {
    albumArtUndersized = true;
    await askQuestion(
      `Album art undersized (${coverMeta.width} x ${coverMeta.height}), continue? `
    );
    console.log('Great, continuing...');
  } else {
    albumArtOversized = true;
  }

  if (albumArtOversized) {
    console.log('Resizing album art');
    cover.resize(ALBUM_ART_RESIZE, ALBUM_ART_RESIZE);
  }

  const mbData = await getMbData(mbUrl);
  const multipleArtists = _.flatten(mbData.discs).some(
    (track) => track.artists.length > 1
  );

  let wikipediaData = { genres: [] };

  if (mbData.wikidata) {
    const wikidata = await getWikidata(mbData.wikidata);

    if (wikidata?.title) {
      wikipediaData = await getWikipediaData(wikidata.title);
    }
  }

  function logDiscs() {
    console.log(
      mbData.discs.map((disc) =>
        disc.map(
          (track, i) =>
            `${i + 1} ${track.title}${
              multipleArtists ? ` [${track.artists.join(', ')}]` : ''
            }`
        )
      )
    );
  }

  function logTracks() {
    console.log('');
    console.log('Files:');
    console.log(files.map((dir) => dir.items.map((file) => file.name)));
    console.log('');
    console.log('MusicBrainz:');
    logDiscs();
  }

  let trackDiff = false;
  files.forEach((dir, i) => {
    if (!trackDiff && dir.items.length !== mbData.discs[i]?.length) {
      trackDiff = true;
    }
  });

  if (files.length !== mbData.discs.length || trackDiff) {
    console.log('Number of tracks does not match');
    logTracks();
    process.exit();
  }

  const trackSimilarity = files.map((dir, i) =>
    dir.items.map((file, j) =>
      stringSimilarity.compareTwoStrings(
        file.name.toLowerCase().replace(/^(\d+-)?\d+\.?\s*-?\s*/, ''),
        replaceSpecialChars(mbData.discs[i][j].title.toLowerCase())
      )
    )
  );

  const similarityWarning = _.flatten(trackSimilarity).some(
    (sim) => sim < SIMILARITY_WARNING
  );

  if (similarityWarning) {
    console.log('Tracks do not look alike');
    console.log('');
    console.log('Similarity:');
    console.log(
      trackSimilarity.map((disc) => disc.map((s, i) => `${i + 1} - ${s}`))
    );
    logTracks();
    await askQuestion('Continue? ');
    console.log('Great, continuing...');
  }

  console.log('Verify metadata:');
  console.log('');
  console.log('Artist:', multipleArtists ? 'Multiple Artists' : mbData.artist);
  if (multipleArtists) console.log('Album Artist:', mbData.artist);
  console.log('Album:', mbData.release);
  console.log('Year:', mbData.year);
  console.log('Genres:', wikipediaData.genres);
  console.log('Tracks:');
  logDiscs();

  await askQuestion('All OK? ');

  console.log('Great, continuing...');

  const discCount = mbData.discs.length;

  await cover.toFile('cover.embed.jpg');

  await sequence(
    _.flatten(
      mbData.discs.map((disc, i) =>
        disc.map(
          (track, j) => () =>
            setMeta(files[i].items[j].path, {
              artist: track.artists.join('; '),
              albumArtist: mbData.artist,
              title: track.title,
              album: mbData.release,
              year: mbData.year,
              genre: wikipediaData.genres.join(', '),
              track: j + 1,
              ...(discCount > 1 ? { disc: i + 1 } : {}),
              coverPicturePath: 'cover.embed.jpg',
            })
        )
      )
    )
  );

  const albumDest = `${DEST}/${replaceSpecialChars(
    mbData.artist,
    true
  )}/${replaceSpecialChars(mbData.release, true)}`;

  await sequence(
    _.flatten(
      mbData.discs.map((disc, i) =>
        disc.map(
          (track, j) => () =>
            copyFile(
              files[i].items[j].path,
              `${albumDest}/${discCount > 1 ? `${i + 1}-` : ''}${String(
                j + 1
              ).padStart(2, '0')} ${replaceSpecialChars(track.title)}.m4a`
            )
        )
      )
    )
  );

  console.log('Saving cover', `${albumDest}/cover.jpg`);
  await cover.toFile(`${albumDest}/cover.jpg`);

  copyFile(
    coverFile,
    `${albumDest}/cover.${albumArtOversized ? 'full' : 'undersized'}.jpg`
  );

  console.log('Saving mbid', `${albumDest}/mbid`);
  await fs.writeFile(`${albumDest}/mbid`, mbData.id, 'utf-8');
}

run();

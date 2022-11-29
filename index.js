const MusicBrainzApi = require('musicbrainz-api').MusicBrainzApi;
const wiki = require('wikipedia');
const { titleCase } = require('title-case');
const _ = require('lodash');
const cheerio = require('cheerio');
const axios = require('axios');
const klaw = require('klaw');
const { orderBy } = require('natural-orderby');
const { basename, extname } = require('path');
const stringSimilarity = require('string-similarity');
const readline = require('readline');
const metadataWriter = require('write-aac-metadata').default;
const sequence = require('promise-sequence');
const fs = require('fs-extra');

const mbApi = new MusicBrainzApi({
  appName: 'farrow-music-namer',
  appVersion: '0.1.0',
  appContactInfo: 'mike@farrow.io',
});

const mbUrl = process.argv[2];

const SIMILARITY_WARNING = 0.9;

async function askQuestion(query) {
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

async function getFiles() {
  const items = [];

  return new Promise((resolve, reject) => {
    klaw('.')
      .on(
        'data',
        (item) =>
          item.path.endsWith('.m4a') &&
          items.push({
            ...item,
            name: basename(item.path, extname(item.path)),
            filename: basename(item.path),
          })
      )
      .on('end', () => resolve(orderBy(items, (item) => item.filename)))
      .on('error', reject);
  });
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

async function getMbData(url) {
  const release = await mbApi.lookupEntity(
    'release',
    url.match(/release\/(.*?)$/)[1],
    ['artists', 'recordings', 'release-groups']
  );
  const group = await mbApi.lookupEntity(
    'release-group',
    release['release-group'].id,
    ['url-rels']
  );
  const wikidataRel = group.relations.find(
    (rel) => rel.type.toLowerCase() === 'wikidata'
  );

  const artist = (release['artist-credit'] || [])?.[0]?.name;
  const tracks = (release.media?.[0]?.tracks || []).map((track) => track.title);
  const year = group['first-release-date'].match(/^\d{4}/)[0];

  return {
    release: group.title,
    artist,
    wikidata: wikidataRel?.url?.resource,
    tracks,
    year,
  };
}

async function getWikidata(url) {
  const entity = url.match(/\/(Q\d+$)/)[1];

  return axios
    .get(`https://www.wikidata.org/wiki/Special:EntityData/${entity}.json`, {
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
    })
    .then((res) => {
      return res.data?.entities?.[entity]?.sitelinks?.enwiki;
    });
}

async function getArtistGenres(artist) {
  try {
    const page = await wiki.page(artist);

    const infobox = await page.infobox();

    return processGenres(infobox?.genre);
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function getWikipediaData(title) {
  try {
    const page = await wiki.page(title);

    const infobox = await page.infobox();
    const html = await page.html();

    const albumTitle = infobox?.name;
    const artist = infobox?.artist;

    const genres = processGenres(infobox?.genre);
    const artistGenres = await getArtistGenres(artist);
    const released = infobox?.released?.date || infobox?.released;

    const normalisedArtist = artist && artist.replace(/\s*\(band\)\s*$/i, '');
    const normalisedAlbumTitle =
      albumTitle && albumTitle.replace(/\s*\(album\)\s*$/i, '');

    let year;

    switch (typeof released) {
      case 'string':
        const foundYear = released.match(/\d{4}/);
        if (foundYear) year = foundYear[0];
        break;
      case 'object':
        const date = new Date(released);
        if (date instanceof Date && !isNaN(date)) year = date.getFullYear();
        break;
    }

    /*
		console.log('Album:', normalisedAlbumTitle);
		console.log('Artist:', normalisedArtist);
		console.log('Genres:', genres, artistGenres);
		console.log('Released:', year);

		const $ = cheerio.load(html);
		const $tables = $('table');

		const discs = [];
		let tracks = [];

		$tables.each(function() {
			$(this).find('tr').each(function() {
				const rowText = $(this).text();
				const length = rowText.match(/\d+:\d/);
				const trackNumber = rowText.match(/^\s*(\d+)/)
				let trackName = $(this).find('> *').eq(1).text().trim();

				if ((trackName[0] === `'` && trackName[trackName.length - 1] === `'`) || (trackName[0] === `"` && trackName[trackName.length - 1] === `"`)) {
					trackName = trackName.substring(1, trackName.length - 1);
				}

				if (trackNumber && length && Number(trackNumber[1]) === tracks.length + 1) {
					tracks.push(trackName);
				}
			});
		});

		tracks.length && discs.push(tracks);
		*/

    return {
      genres: genres.length ? genres : artistGenres,
    };
  } catch (e) {
    console.log(e);
  }
}

async function run() {
  const files = await getFiles();
  const coverExists = await fs.exists('./cover.jpg');

  if (!coverExists) {
    console.log('cover file does not exist');
    process.exit();
  }

  const mbData = await getMbData(mbUrl);

  let wikipediaData;

  if (mbData.wikidata) {
    const wikidata = await getWikidata(mbData.wikidata);

    if (wikidata?.title) {
      wikipediaData = await getWikipediaData(wikidata.title);
    }
  }

  function logTracks() {
    console.log('');
    console.log('Files:');
    console.log(files.map((file) => file.filename));
    console.log('');
    console.log('MusicBrainz:');
    console.log(mbData.tracks);
  }

  if (files.length !== mbData.tracks.length) {
    console.log('Number of tracks does not match');
    logTracks();
    process.exit();
  }

  const trackSimilarity = files.map((file, i) =>
    stringSimilarity.compareTwoStrings(
      file.name.toLowerCase().replace(/^\d+\.?\s*-?\s*/, ''),
      mbData.tracks[i].toLowerCase()
    )
  );

  const similarityWarning = trackSimilarity.some(
    (sim) => sim < SIMILARITY_WARNING
  );

  if (similarityWarning) {
    console.log('Tracks do not look alike');
    console.log('');
    console.log('Similarity:');
    console.log(trackSimilarity);
    logTracks();
    process.exit();
  }

  console.log('Verify metadata:');
  console.log('');
  console.log('Artist:', mbData.artist);
  console.log('Album:', mbData.release);
  console.log('Year:', mbData.year);
  console.log('Genres:', wikipediaData.genres);
  console.log(
    'Tracks:',
    mbData.tracks.map(
      (track, i) => `${String(i + 1).padStart(2, '0')} ${track}`
    )
  );

  await askQuestion('All OK? ');

  console.log('Great, continuing...');

  sequence(
    mbData.tracks.map(
      (track, i) => () =>
        setMeta(files[i].path, {
          artist: mbData.artist,
          title: track,
          album: mbData.release,
          date: mbData.year,
          genre: wikipediaData.genres.join(', '),
          track: i + 1,
          coverPicturePath: 'cover.jpg',
        })
    )
  );
}

run();

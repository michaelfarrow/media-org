const MusicBrainzApi = require('musicbrainz-api').MusicBrainzApi;

const mbApi = new MusicBrainzApi({
  appName: 'farrow-music-namer',
  appVersion: '0.1.0',
  appContactInfo: 'mike@farrow.io',
});

module.exports = mbApi;

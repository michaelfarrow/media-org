import { MusicBrainzApi } from 'musicbrainz-api';

const musicBrainz = new MusicBrainzApi({
  botAccount: {},
  appName: 'farrow-music-namer',
  appVersion: '0.1.0',
  appContactInfo: 'mike@farrow.io',
});

export default musicBrainz;

export * from 'musicbrainz-api';

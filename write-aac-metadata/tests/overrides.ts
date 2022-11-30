import path from 'path';

export const baseOverrides = {
  album: '\\a\\l"b"u\'m\'',
  artist: '\\a\\r"t"is\'t\'',
  albumArtist: '\\a\\lb"u"mArtis\'t\'',
  grouping: '\\g\\r"o"upin\'g\'',
  composer: '\\c\\om"po"se\'r\'',
  year: 2019,
  track: 2,
  comment: '\\c\\om"m"en\'t\'',
  genre: '\\g\\e"n"r\'e\'',
  copyright: '\\c\\opy"r"igh\'t\'',
  description: '\\d\\esc"r"iptio\'n\'',
  title: '\\t\\i"t"l\'e\'',
  synopsis: '\\s\\yn"o"psi\'s\'',
};

export const multiLineOverrides = {
  album: 'al\nbu\nm',
  artist: 'ar\ntis\nt',
  albumArtist: 'alb\numArtis\nt',
  grouping: 'gro\nupin\ng',
  composer: 'com\npose\nr',
  year: 2019,
  track: 2,
  comment: 'com\nmen\nt',
  genre: 'ge\nnr\ne',
  copyright: 'copy\nrigh\nt',
  description: 'desc\nriptio\nn',
  synopsis: 'syno\npsi\ns',
  title: 'tit\nl\ne',
};

export const singleOverride = {
  composer: 'composer',
};

export const pictureOverride = {
  coverPicturePath: path.join(__dirname, 'test.jpg'),
  composer: 'composer',
};

import osMethodsfrom from 'opensubtitles.com/methods.json';
osMethodsfrom['/download'].opts.auth = false;

import OS from 'opensubtitles.com';

import { API_KEY_OPENSUBTITLES } from '@/lib/env';
import { getPaged } from '@/lib/data';
import { orderBy } from 'lodash';

export type Subtitle = {
  id: string;
  type: string;
  attributes: {
    release: string;
    language: string;
    hearing_impaired: boolean;
    from_trusted: boolean;
    ai_translated: boolean;
    machine_translated: boolean;
    foreign_parts_only: boolean;
    votes: number;
    ratings: number;
    fps: number;
    download_count: number;
    new_download_count: number;
    files: { file_id: number }[];
  };
};

export type SubtitleDownload = {
  link: string;
  file_name: string;
  requests: number;
  remaining: number;
  reset_time: string;
};

const os = new OS({
  apikey: API_KEY_OPENSUBTITLES,
  useragent: 'media-org v0.1.0',
});

export async function getSubtitles(id: string) {
  const subtitles = await getPaged(
    async ({ limit, offset }) => {
      const res = await os.subtitles({
        imdb_id: id,
        page: offset / limit + 1,
      });

      return {
        expect: res.total_count as number,
        results: res.data as Subtitle[],
      };
    },
    { limit: 50 }
  );

  return orderBy(
    subtitles.filter((subtitle) => {
      const {
        attributes: {
          language: subLanguage,
          ai_translated,
          machine_translated,
          hearing_impaired,
        },
      } = subtitle;
      if (ai_translated || machine_translated) return false;
      if (hearing_impaired) return false;
      if (subLanguage !== 'en') return false;
      return true;
    }),
    (subtitle) => {
      const {
        attributes: { download_count, new_download_count },
      } = subtitle;
      return download_count + new_download_count;
    },
    'desc'
  );
}

export async function getSubtitleLink(subtitle: Subtitle) {
  const file = subtitle.attributes.files[0];
  if (!file) throw new Error('Could not find subtitle file');
  const download: SubtitleDownload | undefined = await os.download({
    file_id: file.file_id,
  });
  return download || undefined;
}

import path from 'path';
import fs from 'fs-extra';
import { RELEASE_FILE } from '@/lib/config';
import { getReleaseFiles, Release } from '@/lib/namer';

export default async function processRelease(
  release: string,
) {
  const releaseFile = path.resolve(release, RELEASE_FILE);
  const info =
    ((await fs.exists(releaseFile)) &&
      Release.parse(await fs.readJson(releaseFile))) ||
    undefined;
  const files = (await getReleaseFiles(release)) || [];

  return { release, info, files }
}

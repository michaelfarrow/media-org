import releases from '@/workflows/releases';

export default async function releasesCommand(all?: boolean) {
  return releases(all);
}

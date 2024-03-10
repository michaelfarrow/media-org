import releases from '@/workflows/releases';

export default async function releasesCommand() {
  return releases();
}

import integrity from '../workflows/integrity';

export default async function integrityCommand() {
  return await integrity();
}

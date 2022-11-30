import metadataWriter from '../src/index';
import * as mm from 'music-metadata';
import fs from 'fs';
import assert from 'assert';
import Metadata from '../src/Metadata';
import path from 'path';
import {
  baseOverrides,
  multiLineOverrides,
  pictureOverride,
  singleOverride,
} from './overrides';

const out = path.join(__dirname, 'test.out.m4b');
const input = path.join(__dirname, 'test.m4b');

describe('write-aac-metadata', () => {
  it('Changing metadata, output to a new file', async () => {
    await removeIfExsits(out);

    await metadataWriter(input, baseOverrides, out);

    const origTags = (await mm.parseFile(input)).common;
    const tags = (await mm.parseFile(out)).common;

    checkMetadata(baseOverrides, origTags, tags, input, out);

    await removeIfExsits(out);
  });

  it('Multiline metadata, output to a new file', async () => {
    await removeIfExsits(out);

    await metadataWriter(input, multiLineOverrides, out);

    const origTags = (await mm.parseFile(input)).common;
    const tags = (await mm.parseFile(out)).common;

    checkMetadata(multiLineOverrides, origTags, tags, input, out);

    await removeIfExsits(out);
  });

  it("Don't delete unchanged metadata, output to a new file", async () => {
    await removeIfExsits(out);

    await metadataWriter(input, singleOverride, out);

    const origTags = (await mm.parseFile(input)).common;
    const tags = (await mm.parseFile(out)).common;

    checkMetadata(singleOverride, origTags, tags, input, out);

    await removeIfExsits(out);
  });

  it('Update photo, output to a new file', async () => {
    await removeIfExsits(out);

    await metadataWriter(input, pictureOverride, out);

    const origTags = (await mm.parseFile(input)).common;
    const tags = (await mm.parseFile(out)).common;

    checkMetadata(pictureOverride, origTags, tags, input, out);

    await removeIfExsits(out);
  });

  it('Changing metadata, output to same file', async () => {
    await removeIfExsits(out);

    // Copy the file so we don't screw up the original
    await metadataWriter(input, {}, out);

    await metadataWriter(out, baseOverrides, out);

    const origTags = (await mm.parseFile(input)).common;
    const tags = (await mm.parseFile(out)).common;

    checkMetadata(baseOverrides, origTags, tags, input, out);

    await removeIfExsits(out);
  });

  it('Changing metadata, output to same file, no output parameter', async () => {
    await removeIfExsits(out);

    // Copy the file so we don't screw up the original
    await metadataWriter(input, {}, out);

    await metadataWriter(out, baseOverrides);

    const origTags = (await mm.parseFile(input)).common;
    const tags = (await mm.parseFile(out)).common;

    checkMetadata(baseOverrides, origTags, tags, input, out);

    await removeIfExsits(out);
  });

  it('Multiline metadata, output to same file', async () => {
    await removeIfExsits(out);

    // Copy the file so we don't screw up the original
    await metadataWriter(input, {}, out);

    await metadataWriter(out, multiLineOverrides, out);

    const origTags = (await mm.parseFile(input)).common;
    const tags = (await mm.parseFile(out)).common;

    checkMetadata(multiLineOverrides, origTags, tags, input, out);

    await removeIfExsits(out);
  });

  it("Don't delete unchanged metadata, output to same file", async () => {
    await removeIfExsits(out);

    // Copy the file so we don't screw up the original
    await metadataWriter(input, {}, out);

    await metadataWriter(out, singleOverride, out);

    const origTags = (await mm.parseFile(input)).common;
    const tags = (await mm.parseFile(out)).common;

    checkMetadata(singleOverride, origTags, tags, input, out);

    await removeIfExsits(out);
  });

  it('Update photo, output to same file', async () => {
    await removeIfExsits(out);

    // Copy the file so we don't screw up the original
    await metadataWriter(input, {}, out);

    await metadataWriter(out, pictureOverride, out);

    const origTags = (await mm.parseFile(input)).common;
    const tags = (await mm.parseFile(out)).common;

    checkMetadata(pictureOverride, origTags, tags, input, out);

    await removeIfExsits(out);
  });

  it('Debug mode (for code coverage)', async () => {
    await removeIfExsits(out);

    await metadataWriter(input, {}, out);

    await removeIfExsits('stdout.log');

    const stdout = fs.createWriteStream('stdout.log');
    const stdoutWrite = process.stdout.write;

    process.stdout.write = stdout.write.bind(stdout) as any;

    await metadataWriter(out, {}, undefined, { debug: true });

    process.stdout.write = stdoutWrite;

    await removeIfExsits(out);
    await removeIfExsits('stdout.log');
  });

  it('Errors', async () => {
    await removeIfExsits(out);

    // File not found
    await assert.rejects(metadataWriter(out, {}));

    // Ffmpeg error
    await assert.rejects(
      metadataWriter(pictureOverride.coverPicturePath, {}, out)
    );

    // Output file already exists
    await assert.rejects(metadataWriter(input, {}, out));

    await removeIfExsits(out);
  });
});

function checkMetadata(
  overrides: Metadata,
  originalMetadata: mm.ICommonTagsResult,
  tags: mm.ICommonTagsResult,
  origFile: string,
  newFile: string
) {
  const origStats = fs.statSync(origFile);
  const newStats = fs.statSync(newFile);

  console.log(tags);

  assert.strictEqual(
    tags.album,
    coalesceUndefined(overrides.album, originalMetadata.album)
  );
  assert.strictEqual(
    tags.artist,
    coalesceUndefined(overrides.artist, originalMetadata.artist)
  );
  assert.strictEqual(
    tags.albumartist,
    coalesceUndefined(overrides.albumArtist, originalMetadata.albumartist)
  );
  assert.strictEqual(
    tags.grouping,
    coalesceUndefined(overrides.grouping, originalMetadata.grouping)
  );
  assert.strictEqual(
    arrayTag(tags.comment),
    coalesceUndefined(overrides.comment, arrayTag(originalMetadata.comment))
  );
  assert.strictEqual(
    arrayTag(tags.genre),
    coalesceUndefined(overrides.genre, arrayTag(originalMetadata.genre))
  );
  assert.strictEqual(
    tags.title,
    coalesceUndefined(overrides.title, originalMetadata.title)
  );
  assert.strictEqual(
    tags.track.no,
    coalesceUndefined(overrides.track, originalMetadata.track.no)
  );
  assert.strictEqual(
    tags.year,
    coalesceUndefined(overrides.year, originalMetadata.year)
  );
  assert.strictEqual(
    arrayTag(tags.composer),
    coalesceUndefined(overrides.composer, arrayTag(originalMetadata.composer))
  );
  assert.strictEqual(
    tags.copyright,
    coalesceUndefined(overrides.copyright, originalMetadata.copyright)
  );
  assert.strictEqual(
    arrayTag(tags.picture)?.data?.length,
    coalesceUndefined(
      overrides.coverPicturePath
        ? fs.statSync(overrides.coverPicturePath).size
        : undefined,
      arrayTag(originalMetadata.picture)?.data?.length
    )
  );
  assert.strictEqual(
    arrayTag(tags.description),
    coalesceUndefined(
      overrides.description,
      arrayTag(originalMetadata.description)
    )
  );
  assert.strictEqual(
    tags.longDescription,
    coalesceUndefined(overrides.synopsis, originalMetadata.longDescription)
  );
  assert.strictEqual(
    Math.round(newStats.mtimeMs),
    Math.round(origStats.mtimeMs)
  );

  if (process.platform !== 'linux') {
    assert.strictEqual(
      Math.round(newStats.birthtimeMs),
      Math.round(origStats.birthtimeMs)
    );
  }
}

function coalesceUndefined<T>(...params: T[]) {
  for (const item of params) {
    if (item !== undefined) {
      return item;
    }
  }

  return undefined;
}

function arrayTag<T>(arr?: T[]) {
  return arr ? arr[0] : undefined;
}

async function removeIfExsits(file: string) {
  if (fs.existsSync(file)) {
    await fs.promises.unlink(file);
  }
}

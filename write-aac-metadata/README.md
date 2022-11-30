# Write AAC Metadata

NodeJS module that will allow you to write aac (m4a, m4b) metadata using ffmpeg

## Installation

```sh
npm install write-aac-metadata --save
yarn add write-aac-metadata
```

## Usage

```javascript
import metadataWriter from 'write-aac-metadata';

const writeMetadata = async () => {
  await metadataWriter(
    'someFile.m4a',
    { title: 'Some Title', description: 'Description' },
    'someFile-copy.m4a'
  );
};

writeMetadata();
```

If you want to modify a file in place don't pass anything to the 3rd parameter. Ffmpeg doesn't allow this directly so to simulate it a new file is created with the input file's name and a guid on the end. After the metadata
has been added and the new file is finished the original file is deleted and the new file is renamed to be the same name as the original file. This package also copies the creation date of the original file to the new file

## Metadata

Set whatever metadata you want updated. Any fields that are left as undefined will not be changed and the current value of the metadata will be copied to the output file

```typescript
{
   title?: string,
   artist?: string,
   albumArtist?: string,
   album?: string,
   grouping?: string,
   composer?: string,
   year?: number,
   track?: number,
   comment?: string,
   genre?: string,
   copyright?: string,
   description?: string,
   synopsis?: string,
   /**
    * The path for the cover photo that should be added to the file, don't set this field if you want to keep the existing art
    */
   coverPicturePath?: string,
}
```

## Options

These are the options you can pass as the 4th parameter

```typescript
{
   /**
    * Write debugging output to the console?
    * @default false
    */
   debug?: boolean,
   /**
    * If stdio should be piped to the current console, useful for figuring out issues with ffmpeg
    * @default false
    */
   pipeStdio?: boolean,
}
```

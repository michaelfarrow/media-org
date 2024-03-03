// // import path from 'path';
// // import { createHandler, z } from '@server/api/lib';
// // import { MUSIC_DOWNLOADS_DIR } from '@server/lib/config';
// // import { getDirs, removeRootPath } from '@server/lib/fs';
// // import { getReleaseFiles } from '@server/lib/music';

// // export const POST = createHandler(
// //   {
// //     body: z.object({ path: z.string().optional() }),
// //   },
// //   async (req) => {
// //     const root = path.resolve(MUSIC_DOWNLOADS_DIR);
// //     const p = path.resolve(root, req.body.path || '.');
// //     if (!p.startsWith(MUSIC_DOWNLOADS_DIR))
// //       throw new Error('Cannot traverse beyond download root');
// //     const dirs = await getDirs(p);
// //     const files = p !== root ? await getReleaseFiles(p) : [];
// //     return {
// //       dirs: dirs.map((dir) => ({
// //         ...dir,
// //         path: removeRootPath(dir.path, root),
// //       })),
// //       files: files.map((group) => ({
// //         ...group,
// //         files: group.files.map((file) => ({
// //           ...file,
// //           path: removeRootPath(file.path, root),
// //           dir: removeRootPath(file.dir, root),
// //         })),
// //       })),
// //     };
// //   }
// // );

// import path from 'path';
// import { createHandler, z } from '@server/api/lib';
// import { MUSIC_DOWNLOADS_DIR } from '@server/lib/config';
// import { getDirs, removeRootPath } from '@server/lib/fs';
// import { getReleaseFiles } from '@server/lib/music';

// export const POST = createHandler(
//   {
//     body: z.object({ path: z.string().optional() }),
//   },
//   async (req) => {
//     const root = path.resolve(MUSIC_DOWNLOADS_DIR);
//     const p = path.resolve(root, req.body.path || '.');
//     if (!p.startsWith(MUSIC_DOWNLOADS_DIR))
//       throw new Error('Cannot traverse beyond download root');
//     const dirs = await getDirs(p);
//     const files = p !== root ? await getReleaseFiles(p) : [];
//     return {
//       dirs: dirs.map((dir) => ({
//         ...dir,
//         path: removeRootPath(dir.path, root),
//       })),
//       files: files.map((group) => ({
//         ...group,
//         files: group.files.map((file) => ({
//           ...file,
//           path: removeRootPath(file.path, root),
//           dir: removeRootPath(file.dir, root),
//         })),
//       })),
//     };
//   }
// );

// import path from 'path';
// import { createHandler, z } from '@server/api/lib';
// import { MUSIC_DOWNLOADS_DIR } from '@server/lib/config';
// import { getDirs, removeRootPath } from '@server/lib/fs';
// import { getReleaseFiles } from '@server/lib/music';

// export const POST = createHandler(
//   {
//     body: z.object({ path: z.string().optional() }),
//   },
//   async (req) => {
//     const root = path.resolve(MUSIC_DOWNLOADS_DIR);
//     const p = path.resolve(root, req.body.path || '.');
//     if (!p.startsWith(MUSIC_DOWNLOADS_DIR))
//       throw new Error('Cannot traverse beyond download root');
//     const dirs = await getDirs(p);
//     const files = p !== root ? await getReleaseFiles(p) : [];
//     return {
//       dirs: dirs.map((dir) => ({
//         ...dir,
//         path: removeRootPath(dir.path, root),
//       })),
//       files: files.map((group) => ({
//         ...group,
//         files: group.files.map((file) => ({
//           ...file,
//           path: removeRootPath(file.path, root),
//           dir: removeRootPath(file.dir, root),
//         })),
//       })),
//     };
//   }
// );

import path from 'path';
import { createHandler, z } from '@server/api/lib';
import { MUSIC_DOWNLOADS_DIR } from '@server/lib/config';
import { getDirs, removeRootPath } from '@server/lib/fs';
import { getReleaseFiles } from '@server/lib/music';

export default createHandler(
  'post',
  z.object({ path: z.string().optional() }),
  async (req) => {
    const root = path.resolve(MUSIC_DOWNLOADS_DIR);
    const p = path.resolve(root, req.body.path || '.');
    if (!p.startsWith(MUSIC_DOWNLOADS_DIR))
      throw new Error('Cannot traverse beyond download root');
    const dirs = await getDirs(p);
    const files = p !== root ? await getReleaseFiles(p) : [];
    return {
      dirs: dirs.map((dir) => ({
        ...dir,
        path: removeRootPath(dir.path, root),
      })),
      files: files.map((group) => ({
        ...group,
        files: group.files.map((file) => ({
          ...file,
          path: removeRootPath(file.path, root),
          dir: removeRootPath(file.dir, root),
        })),
      })),
    };
  }
);

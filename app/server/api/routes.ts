import { createRoutes } from './lib';
import files from './files';
import namer from './namer';

export const routes = createRoutes({
  ...files,
  ...namer,
});

export type Routes = typeof routes;

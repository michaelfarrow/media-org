import { Route, createApi } from './lib';
import { type Routes, routes } from './routes';

const PORT = 3000;

export function initApi() {
  return createApi({ port: PORT, routes });
}

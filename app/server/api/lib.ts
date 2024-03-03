import express, { Request } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { z, type ZodObject, ZodError } from '@server/lib/zod';
import { fromZodError } from 'zod-validation-error';

export type Method = 'get' | 'post';

export type Routes<Path extends string> = {
  [path in Path]: ReturnType<typeof createHandler>;
};

export type Route<T extends Routes<any>, Path extends keyof T> = T[Path];

export function createRoutes<T extends Routes<any>>(routes: T) {
  return routes;
}

export type Params = ZodObject<any>;

export function createHandler<
  ResponseBody extends any,
  HandlerMethod extends Method,
  HandlerParams extends Params | null,
  Handler extends (
    req: Request<
      any,
      any,
      HandlerMethod extends 'post'
        ? HandlerParams extends ZodObject<any>
          ? z.infer<HandlerParams>
          : any
        : any,
      HandlerMethod extends 'get'
        ? HandlerParams extends ZodObject<any>
          ? z.infer<HandlerParams>
          : any
        : any
    >
  ) => ResponseBody
>(method: HandlerMethod, params: HandlerParams, handler: Handler) {
  return {
    method,
    params,
    handler,
  };
}

export type HandlerReturnType<
  T extends Routes<any>,
  Path extends keyof T
> = ReturnType<T[Path]['handler']>;

export type HandlerMethod<
  T extends Routes<any>,
  Path extends keyof T
> = T[Path]['method'];

export type HandlerParams<
  T extends Routes<any>,
  Path extends keyof T,
  Config = T[Path]['params'] extends Params ? z.infer<T[Path]['params']> : null
> = Config;

export function createApi(options: { port: number; routes: Routes<any> }) {
  const { port, routes } = options;

  const app = express();

  app.use(cors());
  app.use(bodyParser.json());

  for (const [path, route] of Object.entries(routes)) {
    const { params, handler, method } = route;

    const get = method === 'get';

    app[method](path, async (req, res) => {
      try {
        if (params) {
          const p = get ? 'query' : 'body';
          req[p] = params.parse(req[p]);
        }
        res.json(await handler(req));
      } catch (e: any) {
        res.status(500).json({
          status: e.code || 500,
          message:
            (e instanceof ZodError && fromZodError(e).toString()) ||
            e.message ||
            'Generic error',
        });
      }
    });
  }

  app.listen(port, () => {
    console.log(`API is running on port ${port}.`);
  });

  return app;
}

export { z };

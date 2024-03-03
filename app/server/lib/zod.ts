import { z } from 'zod';

type ZodCustom = typeof z & {
  strictBoolean: typeof strictBoolean;
  coerce: (typeof z)['coerce'] & {
    strictBoolean: typeof strictBoolean;
  };
};

const strictBoolean = (...params: Parameters<typeof z.boolean>) => {
  const [options] = params;

  return z
    .enum(['0', '1', 'true', 'false'], options)
    .catch('false')
    .transform((value) =>
      options?.coerce ? value == 'true' || value == '1' : value
    );
};

const strictBooleanCoorder = (...params: Parameters<typeof z.boolean>) => {
  const [options = {}] = params;
  return strictBoolean({ ...options, coerce: true });
};

const customZod: ZodCustom = {
  ...z,
  strictBoolean,
  coerce: { ...z.coerce, strictBoolean: strictBooleanCoorder },
};

export * from 'zod';

export { customZod as z };

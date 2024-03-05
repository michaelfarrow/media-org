import { z as originalZod } from 'zod';

type ZodCustom = typeof originalZod & {
  strictBoolean: typeof strictBoolean;
  coerce: (typeof originalZod)['coerce'] & {
    strictBoolean: typeof strictBoolean;
  };
};

const strictBoolean = (...params: Parameters<typeof z.boolean>) => {
  const [options] = params;

  return originalZod
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

const z: ZodCustom = {
  ...originalZod,
  strictBoolean,
  coerce: { ...originalZod.coerce, strictBoolean: strictBooleanCoorder },
};

export * from 'zod';

export { z };

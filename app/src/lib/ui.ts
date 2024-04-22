import inquirer from 'inquirer';

const AUTO_CONFIRM = process.env.AUTO_CONFIRM?.toLowerCase() === 'true';

export async function confirm(message: string) {
  if (AUTO_CONFIRM) return true;

  const answer = await inquirer.prompt<{ response: boolean }>({
    name: 'response',
    type: 'confirm',
    message,
  });

  return answer.response;
}

export async function input(message: string) {
  if (AUTO_CONFIRM)
    throw new Error('Cannot use auto confirm when user input is required.');

  const answer = await inquirer.prompt<{ input: string }>({
    name: 'input',
    type: 'input',
    message,
  });

  return answer.input.trim();
}

export async function choices<
  T,
  O extends { allowNone?: boolean },
  R = O['allowNone'] extends true ? T | undefined : T
>(
  message: string,
  choices: { name: string; value: T }[],
  options?: O
): Promise<R> {
  const { allowNone } = options || {};
  const answer = await inquirer.prompt<{ selected: R }>({
    name: 'selected',
    type: 'list',
    message,
    choices: [
      ...(allowNone
        ? [
            new inquirer.Separator(),
            { value: undefined, name: 'None' },
            new inquirer.Separator(),
          ]
        : []),
      ...choices,
    ],
  });
  return answer.selected;
}

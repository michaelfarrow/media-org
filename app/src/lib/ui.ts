import readline from 'readline';
import prompts from 'prompts';

const AUTO_CONFIRM = process.env.AUTO_CONFIRM?.toLowerCase() === 'true';

async function question(message: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return (
    (
      await prompts({
        type: 'text',
        name: 'question',
        message,
      })
    ).question || ''
  );
}

export async function confirm(message: string) {
  if (AUTO_CONFIRM) return true;
  return (await question(`${message} (Y)`)).toLowerCase().trim() !== 'n';
}

export function input(message: string) {
  if (AUTO_CONFIRM)
    throw new Error('Cannot use auto confirm when user input is required.');
  return question(message);
}

export async function choices<T>(
  message: string,
  choices: { title: string; value: T }[]
): Promise<T | undefined> {
  return (
    await prompts({
      type: 'select',
      name: 'choice',
      message,
      choices,
    })
  ).choice;
}

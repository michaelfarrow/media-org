import readline from 'readline';

const AUTO_CONFIRM = process.env.AUTO_CONFIRM?.toLowerCase() === 'true';

async function question(message: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(`${message} `, (ans) => {
      rl.close();
      resolve(ans);
    })
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

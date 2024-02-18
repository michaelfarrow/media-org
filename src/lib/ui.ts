import readline from 'readline';

export async function question(message: string): Promise<string> {
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
  return (await question(`${message} (Y) `)).toLowerCase().trim() !== 'n';
}

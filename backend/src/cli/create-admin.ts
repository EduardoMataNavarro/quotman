// `npm run admin:create`: creates an admin in the database in DATABASE_URL (.dev.vars).
// Asks for the email and password interactively so neither lands in shell history.
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { buildModules } from '../modules';

const url = process.env['DATABASE_URL'];
if (!url) {
  console.error('DATABASE_URL is not set. Add it to .dev.vars.');
  process.exit(1);
}

const rl = createInterface({ input: stdin, output: stdout });
const email = (await rl.question('Correo: ')).trim();

// Hide the password while it's typed.
const ask = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
const write = ask._writeToOutput.bind(rl);
ask._writeToOutput = (s) => write(s.includes('\n') || s.startsWith('Contraseña') ? s : '*');
const password = await rl.question('Contraseña (mínimo 12 caracteres): ');
ask._writeToOutput = write;
rl.close();
stdout.write('\n');

if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12) {
  console.error('Correo no válido o contraseña de menos de 12 caracteres.');
  process.exit(1);
}

const admin = await buildModules({ DATABASE_URL: url }).auth.createAdmin(email, password);
console.log(`Administrador creado: ${admin.email}`);

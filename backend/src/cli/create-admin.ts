// `npm run admin:create`: creates an admin in the database in DATABASE_URL (.dev.vars).
// Asks for the email and password interactively so neither lands in shell history.
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Writable } from 'node:stream';
import { buildModules } from '../modules';

const url = process.env['DATABASE_URL'];
if (!url) {
  console.error('DATABASE_URL is not set. Add it to .dev.vars.');
  process.exit(1);
}

// readline echoes through `output`; muting it hides the password while it's typed.
let muted = false;
const output = new Writable({
  write(chunk, _encoding, done) {
    if (!muted) stdout.write(chunk);
    done();
  },
});
const rl = createInterface({ input: stdin, output, terminal: stdin.isTTY });
const email = (await rl.question('Correo: ')).trim();

stdout.write('Contraseña (mínimo 12 caracteres): ');
muted = true;
const password = await rl.question('');
muted = false;
rl.close();
stdout.write('\n');

if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12) {
  console.error('Correo no válido o contraseña de menos de 12 caracteres.');
  process.exit(1);
}

const admin = await buildModules({ DATABASE_URL: url }).auth.createAdmin(email, password);
console.log(`Administrador creado: ${admin.email}`);

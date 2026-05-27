const fs = require('fs');

const targetFolderPath = './src/environments';
const targetPath = './src/environments/environment.ts';

// Si no está definida la variable de entorno API_KEY y ya existe el archivo localmente,
// no lo sobreescribimos para no borrar las llaves de desarrollo locales.
if (!process.env.API_KEY) {
  if (fs.existsSync(targetPath)) {
    console.log('⚠️ No API_KEY env variable found. Keeping existing environment.ts to prevent overwriting development keys.');
    process.exit(0);
  }
}

// process.env.API_KEY leerá la variable que configuraste en Vercel
const envConfigFile = `export const environment = {
  production: true,
  baseUrl: 'https://api.themoviedb.org/3',
  apiKey: '${process.env.API_KEY || ""}',
  tmdbApiKey: '${process.env.API_KEY || ""}',
  imgPath: 'https://image.tmdb.org/t/p/w500'
};
`;

if (!fs.existsSync(targetFolderPath)) {
  fs.mkdirSync(targetFolderPath, { recursive: true });
}

fs.writeFileSync(targetPath, envConfigFile);
console.log('✅ Archivo environment.ts generado correctamente en Vercel.');

import {mkdir,copyFile,cp,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const file of ['index.html','styles.css','manifest.webmanifest','sw.js'])await copyFile(file,`dist/${file}`);
for(const dir of ['src','assets'])await cp(dir,`dist/${dir}`,{recursive:true});
const builtAt=new Date().toISOString(),tag=builtAt.replace(/\D/g,''),modules=(await readdir('src')).filter(name=>name.endsWith('.js'));
const files=['index.html','manifest.webmanifest',`styles.${tag}.css`];
for(const name of modules){let code=(await readFile(`src/${name}`,'utf8')).replace('__BUILD_TIME__',builtAt);for(const dependency of modules)code=code.replaceAll(`'./${dependency}'`,`'./${dependency.replace('.js',`.${tag}.js`)}'`).replaceAll(`"./${dependency}"`,`"./${dependency.replace('.js',`.${tag}.js`)}"`);const versioned=`src/${name.replace('.js',`.${tag}.js`)}`;await writeFile(`dist/${versioned}`,code);await writeFile(`dist/src/${name}`,code);files.push(versioned);}
await copyFile('styles.css',`dist/styles.${tag}.css`);
const index=await readFile('index.html','utf8');await writeFile('dist/index.html',index.replace('src/app.js',`src/app.${tag}.js`).replace('href="styles.css"',`href="styles.${tag}.css"`));
for(const name of await readdir('dist/assets'))files.push(`assets/${name}`);
const hashes={};for(const file of files.sort())hashes['./'+file]=createHash('sha256').update(await readFile(`dist/${file}`)).digest('hex');
const worker=await readFile('sw.js','utf8');await writeFile('dist/sw.js',worker.replace("CACHE_PREFIX+'development'",`CACHE_PREFIX+${JSON.stringify(builtAt)}`).replace('const ASSET_HASHES={}; // BUILD_ASSET_HASHES',`const ASSET_HASHES=${JSON.stringify(hashes)};`));
console.log(`Static application built in dist/ at ${builtAt}`);

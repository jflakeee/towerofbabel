import {mkdir,copyFile,cp,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist');
for(const file of ['index.html','styles.css','manifest.webmanifest','sw.js']) await copyFile(file,`dist/${file}`);
for(const dir of ['src','assets']) await cp(dir,`dist/${dir}`,{recursive:true});
console.log('Static application built in dist/');

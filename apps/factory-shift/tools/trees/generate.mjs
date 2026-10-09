import { build } from 'esbuild';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, quantize, textureCompress } from '@gltf-transform/functions';
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const here=fileURLToPath(new URL('.',import.meta.url));
const output=fileURLToPath(new URL('../../public/models/trees/',import.meta.url));
const temporary=await mkdtemp(join(tmpdir(),'riskmulate-trees-'));
const buildResult=await build({entryPoints:[join(here,'generate-browser.mjs')],bundle:true,format:'esm',write:false});
const port=Number(process.env.TREE_PORT||45479);
const server=createServer((request,response)=>{
 response.setHeader('Content-Type',request.url==='/generator.js'?'text/javascript':'text/html');
 response.end(request.url==='/generator.js'?buildResult.outputFiles[0].contents:'<script type="module" src="/generator.js"></script>');
});
await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
let browser;
try {
 browser=await puppeteer.launch({headless:true,pipe:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader',...(process.env.TREE_BROWSER_SINGLE_PROCESS==='1'?['--single-process','--no-zygote']:[])]});
 const page=await browser.newPage();
 await page.goto(`http://127.0.0.1:${port}`);await page.waitForFunction(()=>window.generateTrees);
 const result=await page.evaluate(()=>window.generateTrees());
 await mkdir(output,{recursive:true});
 const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
 for(const file of result.output){
  const doc=await io.readBinary(new Uint8Array(file.data));
  for(const material of doc.getRoot().listMaterials())if(material.getName()==='needles')material.setAlphaMode('MASK').setAlphaCutoff(0.5).setDoubleSided(true);
  await doc.transform(dedup(),quantize(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024]}));
  const binary=await io.writeBinary(doc);
  if(binary.length>=4*1024*1024)throw new Error(`${file.name} exceeds 4 MB`);
  await writeFile(join(output,file.name),binary);delete file.data;console.log(file.name,file.triangles,binary.length);
 }
 await writeFile(join(output,'treeline-atlas.png'),Buffer.from(result.atlas.split(',')[1],'base64'));
 await writeFile(join(here,'presets.json'),JSON.stringify(result.output,null,2)+'\n');
} finally {
 await browser?.close();server.close();await rm(temporary,{recursive:true,force:true});
}

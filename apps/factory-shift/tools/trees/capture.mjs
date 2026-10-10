import {build} from 'esbuild';
import puppeteer from 'puppeteer';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join,extname} from 'node:path';
import {tmpdir} from 'node:os';

const root=fileURLToPath(new URL('../../',import.meta.url));
const repository=fileURLToPath(new URL('../../../../',import.meta.url));
const phase=process.argv[2]||'after',mode=process.argv[3]||'desktop';
const baseline=process.env.BASELINE_REF||'5c86b8fa2ce6e38be302372a104c5f9f36ab8c65';
const temporary=await mkdtemp(join(tmpdir(),'riskmulate-tree-capture-'));
const output=join(root,'docs/trees');await mkdir(output,{recursive:true});
const errors=[];
const plugins=[{name:'capture-instrumentation',setup(b){b.onLoad({filter:/app\/(factory-scene\.tsx|factory-experience\.tsx|generated-assets\.ts)$/},async a=>{
 let source=phase==='before'?execFileSync('git',['show',`${baseline}:apps/factory-shift/${a.path.slice(root.length)}`],{cwd:repository,encoding:'utf8'}):await readFile(a.path,'utf8');
 if(a.path.endsWith('factory-scene.tsx'))source=source
 .replace('const softwareRenderer = /swiftshader|llvmpipe|software/i.test(rendererName);',`const softwareRenderer = ${mode==='software'};`)
 .replace('const composer = new EffectComposer(renderer);','window.__capture = { renderer, scene, camera, softwareRenderer, coarsePointer }; renderer.info.autoReset=false; const composer = new EffectComposer(renderer);')
 .replace('composer.addPass(new OutputPass());','composer.addPass(new OutputPass()); window.__capture.composer=composer;')
 .replace('const valleyTrees = createValleyTrees(scene, assetUrl, coarsePointer, softwareRenderer);','const valleyTrees = createValleyTrees(scene, assetUrl, coarsePointer, softwareRenderer); window.__capture.trees=valleyTrees;');
 return {contents:source,loader:a.path.endsWith('.tsx')?'tsx':'ts'};
});}}];
await build({entryPoints:[join(root,'standalone/entry.tsx')],bundle:true,format:'esm',outfile:join(temporary,'app.js'),define:{'process.env.NODE_ENV':'"development"'},plugins});
await writeFile(join(temporary,'index.html'),'<link rel="stylesheet" href="/app.css"><div id="riskmulate-root"></div><script type="module" src="/app.js"></script>');
const port=Number(process.env.TREE_PORT||45479);
const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp','.hdr':'application/octet-stream'};
const server=createServer(async(request,response)=>{
 const path=(request.url||'/').split('?')[0].slice(1)||'index.html';
 if(path.includes('..')){response.writeHead(400);response.end();return;}
 try {const data=await readFile(join(['app.js','app.css','index.html'].includes(path)?temporary:join(root,'public'),path));response.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');response.end(data);}catch{response.writeHead(404);response.end();}
});await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
let browser;
try {
 browser=await puppeteer.launch({headless:true,pipe:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader',...(process.env.TREE_BROWSER_SINGLE_PROCESS==='1'?['--single-process','--no-zygote']:[])]});
 const page=await browser.newPage();
 const dpr=mode==='mobile'?1.1:1.4;
 await page.setViewport({width:1600,height:900,deviceScaleFactor:dpr,isMobile:mode==='mobile',hasTouch:mode==='mobile'});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.evaluateOnNewDocument(mode=>{
  const raf=window.requestAnimationFrame.bind(window);let frames=0;window.requestAnimationFrame=callback=>frames++<3?raf(callback):0;
  if(mode==='fallback'){const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return ['webgl','webgl2'].includes(type)?null:getContext.call(this,type,...args);};}
 },mode);
 await page.goto(`http://127.0.0.1:${port}`,{waitUntil:'load',timeout:60000});
 if(mode==='fallback'){
  await page.waitForSelector('.fallback-mountains');
  await page.screenshot({path:join(output,`${phase}-fallback.png`),clip:{x:0,y:0,width:1600,height:900,scale:1/dpr}});
  await writeFile(join(output,`${phase}-fallback.json`),JSON.stringify({fallbackMountains:true,errors},null,2)+'\n');
 }else{
  await page.waitForFunction(()=>window.__capture?.scene.getObjectByName('Meshy P-204 centrifugal pump')&&window.__capture.scene.getObjectByName('Poly Haven weathered rock'),{polling:100,timeout:60000});
  if(phase==='after')await page.waitForFunction(()=>window.__capture.trees.getStats().ready,{polling:100,timeout:60000});
  await page.waitForNetworkIdle({idleTime:500,timeout:60000});
  const views=[{name:'title'},{name:'yard',position:[0,1.72,15.5],target:[0,3,-15]},{name:'west',position:[-20,1.72,12],target:[-32,4,-10]},{name:'east',position:[20,1.72,0],target:[32,4,-25]}];
  const results=[];
  for(const view of views){
   if(view.name==='yard')await page.evaluate(()=>document.querySelector('.start-screen')?.remove());
   const stats=await page.evaluate(view=>{
    const c=window.__capture;if(view.position){c.camera.position.set(...view.position);c.camera.lookAt(...view.target);}
    const frames=[];for(let i=0;i<4;i++){c.renderer.info.reset();const start=performance.now();if(c.softwareRenderer)c.renderer.render(c.scene,c.camera);else c.composer.render();c.renderer.getContext().finish();frames.push(performance.now()-start);}
    return {...c.renderer.info.render,pixelRatio:c.renderer.getPixelRatio(),softwareRenderer:c.softwareRenderer,coarsePointer:c.coarsePointer,frames,treeBudget:c.trees?.getStats(),instances:c.scene.getObjectByName('Kestrel Valley generated treeline')?.children.map(m=>({name:m.name,count:m.count,triangles:m.geometry.index.count/3*m.count,height:m.geometry.boundingBox?.max.y,castShadow:m.castShadow,receiveShadow:m.receiveShadow}))};
   },view);
   await page.screenshot({path:join(output,`${phase}-${mode}-${view.name}.png`),clip:{x:0,y:0,width:1600,height:900,scale:1/dpr}});
   results.push({view:view.name,...stats});console.log(view.name,stats.treeBudget||stats.triangles);
  }
  await writeFile(join(output,`${phase}-${mode}.json`),JSON.stringify({renderer:'SwiftShader in the verification environment. Desktop/mobile paths forced for geometry checks. GPU-finish timings are software measurements.',errors,results},null,2)+'\n');
 }
}finally{await browser?.close();server.close();await rm(temporary,{recursive:true,force:true});}

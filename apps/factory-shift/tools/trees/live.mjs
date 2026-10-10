import puppeteer from 'puppeteer';
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const url='https://riskmulate.vercel.app';
const output=fileURLToPath(new URL('../../docs/trees/',import.meta.url));
await mkdir(output,{recursive:true});
const browser=await puppeteer.launch({headless:true,pipe:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader',...(process.env.TREE_BROWSER_SINGLE_PROCESS==='1'?['--single-process','--no-zygote']:[]),...(process.env.HTTPS_PROXY?['--proxy-server='+process.env.HTTPS_PROXY,'--ignore-certificate-errors']:[])]});
try{
  const page=await browser.newPage();
  await page.setViewport({width:1600,height:900,deviceScaleFactor:1});
  const errors=[],assets=[],bundles=[];
  let budget;
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',async message=>{
    if(message.type()==='error')errors.push(message.text());
    if(message.text().startsWith('[trees] Geometry budget'))budget=await message.args()[1].jsonValue();
  });
  page.on('response',response=>{
    const entry={url:response.url(),status:response.status()};
    if(entry.url.includes('/models/trees/'))assets.push(entry);
    if(entry.url.includes('/standalone/app.'))bundles.push(entry);
  });
  await page.evaluateOnNewDocument(()=>{
    const raf=window.requestAnimationFrame.bind(window);
    window.__freezeCapture=false;
    window.requestAnimationFrame=callback=>window.__freezeCapture?0:raf(callback);
  });
  await page.goto(url+'?tree-verification='+Date.now(),{waitUntil:'load',timeout:90000});
  await page.waitForFunction(()=>/EZ-Tree/i.test(document.body.innerText),{polling:100,timeout:60000});
  await page.waitForNetworkIdle({idleTime:1000,timeout:90000});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>{window.__freezeCapture=true;resolve();})));
  const footer=await page.$eval('.asset-credits',element=>element.textContent).catch(()=>page.evaluate(()=>document.body.innerText.match(/PROPS[^\n]*/i)?.[0]||''));
  const screenshot=await page.screenshot({type:'png'});
  await sharp(screenshot).webp({quality:90}).toFile(join(output,'live-title.webp'));
  const result={url,capturedAt:new Date().toISOString(),renderer:'Native software WebGL detection in Chrome Headless Shell; no production render-path override.',budget,assets,bundles,errors,footer};
  await writeFile(join(output,'live-verification.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
  if(!budget?.ready||budget.failures.length||errors.length||assets.some(asset=>asset.status!==200))process.exitCode=1;
}finally{await browser.close();}

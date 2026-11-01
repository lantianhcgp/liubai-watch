import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {connect} from './parity-cdp.mjs';
const c=await connect('app');const root=path.resolve('qa/.state'),artifact=fs.readFileSync('qa/.parity-artifact-path','utf8').trim();
try{
 await c.send('Page.bringToFront');await c.send('Network.enable');await c.send('Network.setCacheDisabled',{cacheDisabled:true});await c.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});await c.send('Emulation.setTimezoneOverride',{timezoneId:'Asia/Shanghai'});await c.send('Emulation.setUserAgentOverride',{userAgent:await c.eval('navigator.userAgent'),acceptLanguage:'zh-CN,zh;q=0.9'});
 if(process.argv.includes('--restore')){
  await c.send('Page.navigate',{url:'about:blank'});await c.wait('document.readyState==="complete"&&location.href==="about:blank"');
  const current=path.join(root,'fs'),snap=path.resolve('qa/.state-before-functional/fs');assert.ok(fs.existsSync(snap));if(fs.existsSync(current))fs.renameSync(current,path.join(root,'preserved-before-restore-'+Date.now()));fs.cpSync(snap,current,{recursive:true});
  function hashes(d){const out={};function scan(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())scan(f);else out[path.relative(d,f)]=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');}}scan(d);return out;}
  assert.deepEqual(hashes(current),hashes(snap));console.log('isolated_sample_fixture_restored');
 }
 await c.send('Page.navigate',{url:'http://127.0.0.1:8792/__app'});await c.wait('document.readyState==="complete"&&typeof Unpacker!=="undefined"&&typeof JSZip!=="undefined"');
 const actual=await c.eval(`(async()=>{SensorPanel.setConfig({width:412,height:484,isCircle:false});DeviceFeatureDisplay.configure(412,484,false);const v=await(await fetch('/__artifact',{cache:'no-store'})).arrayBuffer();window.__parityArtifactSha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',v))).map(x=>x.toString(16).padStart(2,'0')).join('');const t=new DataTransfer();t.items.add(new File([v],'liubai-final.app',{type:'application/zip'}));const input=document.getElementById('file-input');input.files=t.files;input.dispatchEvent(new Event('change',{bubbles:true}));return window.__parityArtifactSha;})()`);
 const expected=crypto.createHash('sha256').update(fs.readFileSync(artifact)).digest('hex');assert.equal(actual,expected);
 await c.wait('DeviceFeaturePageNav.getCurrentPage()?.data.ready&&!DeviceFeaturePageNav.getCurrentPage().data.loading&&!!document.getElementById("watch-content").shadowRoot.querySelector(".surface")');
 console.log(JSON.stringify({actualArtifact:artifact,artifactSha:actual,locale:await c.eval('navigator.language'),page:await c.eval('DeviceFeaturePageNav.getCurrentPage().uri'),visibleSurface:true}));
}finally{c.close();}

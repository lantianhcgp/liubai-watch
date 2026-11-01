import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import os from 'node:os';import path from 'node:path';
const source=fs.readFileSync(path.join(process.env.LIUBAI_SIM_DIR||path.join(os.homedir(),'liubai-watch-ui-sim'),'js/runtime/sandbox.js'),'utf8');
function harness(locale='zh-CN'){
 const errors=[];const ctx={console:{log(){},warn(){},error(...args){errors.push(args.map(String).join(' '));}},TextDecoder,ArrayBuffer,Uint8Array,navigator:{language:locale},document:{createElement:tag=>({tagName:tag,childNodes:[],style:{},classList:{add(){}},setAttribute(){},addEventListener(){}})},setTimeout,clearTimeout,setInterval,clearInterval,ApiSimWearengine:{},ApiSimApp:{},ApiSimBattery:{},ApiSimBrightness:{},ApiSimDevice:{},ApiSimFile:{},ApiSimStorage:{},ApiSimVibrator:{},ApiRegistry:{resolve(){return{}}},DeviceFeaturePageNav:{setAppData(){}},DeviceFeatureAppLifecycle:{setAppData(){}}};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source,ctx);return{ctx,errors};
}
function appData(){const enc=s=>Uint8Array.from(Buffer.from(s)).buffer;return{modules:{},hapFiles:{'assets/js/MainAbility/i18n/zh-CN.json':enc(JSON.stringify({strings:{saving:'保存中',done:'完成',fallback:'保留文字'}})),'assets/js/MainAbility/i18n/en-US.json':enc(JSON.stringify({strings:{saving:'Saving',done:'Done'}}))}};}
test('compiled HML $t resolves genuine package locale JSON on cold page initialization',()=>{
 const{ctx:c,errors}=harness();const d=appData();c.Sandbox.initApp('(function(){return new ViewModel({data:{}})})()',d);const p=c.Sandbox.initPage('(function(){return new ViewModel({data:{saving:false},render:function(){return {text:this.$t(this.saving?"strings.saving":"strings.done")}}})})()','pages/edit/edit',d);
 assert.equal(p.render().text,'完成');p.data.saving=true;assert.equal(p.render().text,'保存中');assert.equal(p.data.$t('strings.absent'),'strings.absent');assert.deepEqual(errors,[]);c.Sandbox.destroy();
});
test('English locale and secondary-language fallback use packaged real values',()=>{
 const{ctx:c}=harness('en-US');const d=appData();c.Sandbox.initApp('(function(){return new ViewModel({data:{}})})()',d);const p=c.Sandbox.initPage('(function(){return new ViewModel({data:{}})})()','test',d);assert.equal(p.data.$t('strings.saving'),'Saving');assert.equal(p.data.$t('strings.fallback'),'保留文字');c.Sandbox.destroy();
});

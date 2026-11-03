import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {test} from 'node:test';

test('device controls are configured only after DOMContentLoaded initializes the real panel', async()=>{
  const file=new URL('../qa/friend_device.mjs',import.meta.url);
  assert.ok(fs.existsSync(file),'Missing cold-load device configuration guard');
  const {configureDevice}=await import(file.href);
  const controls={};
  for(const id of ['shape-select','width-input','height-input','battery-slider','battery-value','use-system-battery']) controls[id]={value:'',checked:false,addEventListener(){},dispatchEvent(){}};
  let actual={windowWidth:466,windowHeight:466,screenShape:'circle'},waited=false;
  const sandbox=vm.createContext({navigator:{},document:{readyState:'loading',getElementById:id=>controls[id]},DeviceFeatureBattery:{setBatteryLevel(){}},DeviceFeatureDisplay:{configure(w,h,c){actual={windowWidth:w,windowHeight:h,screenShape:c?'circle':'rect'};},getDeviceInfo(){return actual;}}});
  const panel=fs.readFileSync(new URL('./fixtures/hmlwsim-sensor-panel.js',import.meta.url),'utf8');
  vm.runInContext(panel,sandbox);
  const c={
    async wait(expression){
      if(expression.includes('document.readyState')){
        sandbox.document.readyState='complete';
        vm.runInContext('SensorPanel.init({onConfigChange:c=>DeviceFeatureDisplay.configure(c.width,c.height,c.isCircle)});SensorPanel.setConfig({width:466,height:466,isCircle:true})',sandbox);
        waited=true;
      }
      assert.equal(vm.runInContext(expression,sandbox),true,'Guard failed: '+expression);
    },
    async eval(expression){assert.ok(waited,'Configured before the real panel bound its controls');return vm.runInContext(expression,sandbox);}
  };
  await configureDevice(c,412,484,'rect');
  assert.deepEqual(actual,{windowWidth:412,windowHeight:484,screenShape:'rect'});
  await configureDevice(c,390,390,'circle');
  assert.deepEqual(actual,{windowWidth:390,windowHeight:390,screenShape:'circle'});
});

/* QA-only device controls. Wait for the real panel to bind on DOMContentLoaded.
 * Never override the application's Device API or page data to rescue a test.
 */
export async function configureDevice(c,w,h,shape){
  if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0||!['rect','circle'].includes(shape)) throw Error('Invalid requested simulator window');
  await c.wait("document.readyState==='complete' && typeof SensorPanel!=='undefined' && typeof DeviceFeatureDisplay!=='undefined' && !!document.getElementById('shape-select') && !!document.getElementById('width-input') && !!document.getElementById('height-input')");
  await c.eval(`(()=>{SensorPanel.setConfig({width:${w},height:${h},isCircle:${shape==='circle'}});const selected=SensorPanel.getConfig();DeviceFeatureDisplay.configure(selected.width,selected.height,selected.isCircle);})()`);
  await c.wait(`(()=>{const selected=SensorPanel.getConfig(),actual=DeviceFeatureDisplay.getDeviceInfo();return selected.width===${w}&&selected.height===${h}&&selected.isCircle===${shape==='circle'}&&actual.windowWidth===${w}&&actual.windowHeight===${h}&&actual.screenShape===${JSON.stringify(shape)};})()`);
}

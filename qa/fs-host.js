/* Host-only adaptation: no source/app.js/page.data test writes.
 * Disk fs is namespaced per bundle and persists app upload, reload, server restart.
 */
(() => {
  const upstream = {getInfo:DeviceFeatureVirtualFS.getInfo, readText:DeviceFeatureVirtualFS.readText};
  const names = ['get','readText','writeText','mkdir','delete','rmdir','list','move','copy'];
  function call(method, params) {
    const args = {};
    for (const key of Object.keys(params || {})) if (typeof params[key] !== 'function') args[key] = params[key];
    const bundle = DeviceFeatureVirtualFS.getBundleName() || 'com.hcbiu.liubai';
    // Build resources stay in imported VirtualFS, never written to persistent app data.
    if (String(args.uri).startsWith('internal://app/rawfile/') && (method==='get'||method==='readText')) {
      const uri = '/user/ace/run/' + bundle + '/resources/' + args.uri.slice('internal://app/'.length);
      const fn = method==='get' ? upstream.getInfo : upstream.readText;
      return fn(uri, {...params, success:value=>{
        if(method==='get') value={uri:args.uri,type:'file',length:value.size};
        if(typeof params.success==='function') params.success(value);
      }});
    }
    fetch('/__fs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bundle,method,args})})
      .then(async response=>{if(!response.ok)throw Error('FS host HTTP '+response.status);return response.json();})
      .then(result=>{
        if(result.ok){if(typeof params.success==='function')params.success(result.value);}
        else if(typeof params.fail==='function')params.fail(result.error,result.code);
      },error=>{if(typeof params.fail==='function')params.fail(String(error),202);})
      .finally(()=>{if(typeof params.complete==='function')params.complete();});
  }
  for(const method of names)ApiSimFile[method]=params=>call(method,params||{});
  ApiSimFile.getInfo=ApiSimFile.get;
  window.LiubaiFileHost={persistent:true,methods:names.slice(),scope:'independent simulator only'};
})();

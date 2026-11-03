/* Disclosed hmlwsim-only IO semantics. Real imported rawfile and isolated disk; no product data edits. */
(function(){
 function call(method,params){params=params||{};var args={};Object.keys(params).forEach(function(k){if(typeof params[k]!=='function')args[k]=params[k]});var bundle=DeviceFeatureVirtualFS.getBundleName();fetch('/__fs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:method,bundle:bundle,args:args})}).then(function(r){if(!r.ok)throw Error('Host HTTP '+r.status);return r.json()}).then(function(r){if(r.ok){if(params.success)params.success(r.value)}else if(params.fail)params.fail(r.error,r.code)},function(e){if(params.fail)params.fail(String(e),300)}).finally(function(){if(params.complete)params.complete()});}
 ['get','access','readText','writeText','mkdir','delete','list'].forEach(function(k){ApiSimFile[k]=function(p){return call(k,p)}});ApiSimFile.getInfo=ApiSimFile.get;
 ApiSimStorage.get=function(p){call('readText',{uri:'internal://app/kvstore/'+p.key,length:127,success:function(v){if(p.success)p.success(v.text)},fail:function(d,c){if(c===301){if(p.success)p.success(p.default||'')}else if(p.fail)p.fail(d,c)}})};
 ApiSimStorage.set=function(p){call('mkdir',{uri:'internal://app/kvstore',success:function(){write()},fail:function(){write()}});function write(){call('writeText',{uri:'internal://app/kvstore/'+p.key,text:p.value,append:false,success:p.success,fail:p.fail})}};
 window.LiubaiFriendHost={scope:'real disk callback adapter, not real device filesystem proof'};
})();

var target=null;
function bind(t){target=t;}
function call(name,args){if(!target){var cb=args[args.length-1];if(typeof cb==='function')cb(new Error('Store unavailable'));return;}return target[name].apply(target,args);}
var api={bind:bind};
function method(name){api[name]=function(){return call(name,arguments);};}
var names=['list','load','save','flag','draftGet','draftPut','draftClear','settingGet','settingPut'];
for(var i=0;i<names.length;i++)method(names[i]);
export default api;

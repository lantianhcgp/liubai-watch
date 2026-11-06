/* Build-only adapter: retain the pinned SDK release config except JerryScript snapshots. */
'use strict';
const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

if (process.env.LIUBAI_JS_ONLY === '1') {
  const expected = '7c22ea2478cf1ca83e40fe2289b1f9d350f35cd456152504d92b1ca46f3c5af6';
  const suffix = path.join('sdk', 'default', 'openharmony', 'js', 'build-tools',
    'ace-loader', 'webpack.lite.config.js');
  const originalLoad = Module._load;
  const adapted = new Map();
  Module._load = function(request, parent, isMain) {
    if (!request.endsWith('webpack.lite.config.js')) return originalLoad.apply(this, arguments);
    const filename = Module._resolveFilename(request, parent, isMain);
    if (!filename.endsWith(suffix)) return originalLoad.apply(this, arguments);
    const digest = crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
    if (digest !== expected) throw new Error('SDK webpack fingerprint changed; refusing JS-only adaptation');
    if (adapted.has(filename)) return adapted.get(filename);
    const factory = originalLoad.apply(this, arguments);
    if (typeof factory !== 'function') throw new Error('SDK lite webpack factory missing');
    const SnapshotPlugin = originalLoad.call(this,
      path.join(path.dirname(filename), 'lib/lite/lite-snapshot-plugin.js'), parent, false);
    const jsOnly = function(env, ...args) {
      if (!env || env.buildMode !== 'release') throw new Error('JS-only lane requires release mode');
      const config = factory(env, ...args);
      const count = config.plugins.filter(plugin => plugin instanceof SnapshotPlugin).length;
      if (count !== 1) throw new Error('Expected exactly one SDK SnapshotPlugin');
      config.plugins = config.plugins.filter(plugin => !(plugin instanceof SnapshotPlugin));
      if (process.env.LIUBAI_JS_ONLY_REPORT) {
        fs.mkdirSync(path.dirname(process.env.LIUBAI_JS_ONLY_REPORT), { recursive: true });
        fs.appendFileSync(process.env.LIUBAI_JS_ONLY_REPORT, JSON.stringify({
          loader_sha256: digest, buildMode: env.buildMode, mode: config.mode,
          minimize: config.optimization.minimize === true,
          snapshot_plugins_removed: count
        }) + '\n');
      }
      console.log('PASS JS-only SDK release adapter: SnapshotPlugin disabled, release options preserved');
      return config;
    };
    adapted.set(filename, jsOnly);
    return jsOnly;
  };
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(join(root, 'tests/fixtures/webpack-lite-6.1.1.280.txt'), 'utf8');
const preload = join(root, 'scripts/js-only-compiler.cjs');
const runner = String.raw`
const Module = require('module');
const original = Module._load;
class SnapshotPlugin {}
class TerserPlugin { constructor(options) { this.options = options; } }
class ResourcePlugin {}
class ResultStates {}
class ReturnExportsPlugin {}
class DefinePlugin {}
class ImageCoverterPlugin {}
class CopyPlugin {}
const stubs = {
  webpack: { DefinePlugin }, 'terser-webpack-plugin': TerserPlugin,
  './lib/lite/lite-snapshot-plugin': SnapshotPlugin,
  './lib/lite/lite-image-coverter-plugin': ImageCoverterPlugin,
  './lib/lite/lite-return-exports-plugin': ReturnExportsPlugin,
  './lib/resource-plugin': ResourcePlugin, './lib/compile-plugin': ResultStates,
  './lib/lite/lite-customize': { checkFilePath() {} }, 'copy-webpack-plugin': CopyPlugin,
  './lib/util': { loadBabelModule(name) { return name; } },
  './lib/lite/lite-enum': { PLATFORM: { VERSION6: 6, VERSION5: 5, VERSION3: 3 } },
  './main.product': { deleteFolderRecursive() {}, readManifest() { return { minPlatformVersion: 6 }; },
    loadEntryObj() { return { app: 'app.js' }; }, checkMultiResourceBuild() {} }
};
Module._load = function(request, parent, main) {
  if (request.endsWith('/lib/lite/lite-snapshot-plugin.js')) return SnapshotPlugin;
  return Object.hasOwn(stubs, request) ? stubs[request] : original.apply(this, arguments);
};
require(process.argv[1]);
process.env.hapMode = 'true';
const config = require(process.argv[2])({ buildMode: 'release', aceModuleRoot: process.argv[3] });
console.log(JSON.stringify({ mode: config.mode, devtool: config.devtool,
  sourceMapFilename: config.output.sourceMapFilename,
  optimization: config.optimization,
  plugins: config.plugins.map(p => p.constructor.name) }));
`;

function compile(enabled, changed = false) {
  const dir = mkdtempSync(join(tmpdir(), 'liubai-webpack-'));
  try {
    const loader = join(dir, 'sdk/default/openharmony/js/build-tools/ace-loader/webpack.lite.config.js');
    mkdirSync(resolve(loader, '..'), { recursive: true });
    writeFileSync(loader, source + (changed ? '\n// changed SDK\n' : ''));
    const env = { ...process.env, LIUBAI_JS_ONLY: enabled ? '1' : '0' };
    delete env.NODE_OPTIONS;
    delete env.LIUBAI_JS_ONLY_REPORT;
    const result = spawnSync(process.execPath, ['-e', runner, preload, loader, dir], { env, encoding: 'utf8' });
    if (result.status === 0) result.config = JSON.parse(result.stdout.trim().split('\n').at(-1));
    return result;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('JS-only preserves the actual pinned SDK release config except SnapshotPlugin', () => {
  const baseline = compile(false);
  const current = compile(true);
  assert.equal(baseline.status, 0, baseline.stderr);
  assert.equal(current.status, 0, current.stderr);
  assert.ok(baseline.config.plugins.includes('SnapshotPlugin'));
  const expected = { ...baseline.config,
    plugins: baseline.config.plugins.filter(name => name !== 'SnapshotPlugin') };
  assert.deepEqual(current.config, expected);
  assert.equal(current.config.mode, 'production');
  assert.equal(current.config.optimization.minimize, true);
  assert.equal(current.config.optimization.minimizer[0].options.terserOptions.compress, false);
  assert.equal(current.config.optimization.minimizer[0].options.terserOptions.mangle, true);
});

test('unknown SDK fingerprint is rejected rather than silently bypassing bytecode compilation', () => {
  const result = compile(true, true);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SDK webpack fingerprint changed/);
});

test('without explicit JS-only opt-in the SDK SnapshotPlugin remains active', () => {
  const result = compile(false);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.config.plugins.filter(name => name === 'SnapshotPlugin').length, 1);
});

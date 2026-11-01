import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import os from 'node:os';import path from 'node:path';
const fontHost=path.join(process.env.LIUBAI_SIM_DIR||path.join(os.homedir(),'liubai-watch-ui-sim'),'js/css-adapter.js');
const s=fs.existsSync(fontHost)?fs.readFileSync(fontHost,'utf8'):'';
test('isolated host maps unavailable native HYQiHei font to the same actual sans font used by approved concept, not Chromium Times fallback',{skip:!s&&'local hmlwsim integration only'},()=>{
 assert.match(s,/@font-face/);assert.match(s,/font-family:\s*'HYQiHei-65S'/);assert.match(s,/local\('Noto Sans CJK SC'\)/);
});

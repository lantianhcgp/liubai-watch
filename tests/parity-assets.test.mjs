import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root='entry/src/main/js/MainAbility/common/';
const images={
 'type/app_name.png':[58,37],'type/write_note.png':[69,34],
 'icons/book_nav_gold.png':[20,20],'icons/book_nav_muted.png':[20,20],
 'icons/calendar_nav_gold.png':[20,20],'icons/calendar_nav_muted.png':[20,20],
 'icons/pin_row_gold.png':[17,17],'icons/plus_cta_ink.png':[27,27],
 'icons/dots_header_warm.png':[23,23],'icons/dots_reader_gold.png':[26,26],
 'icons/dots_editor_warm.png':[23,23],'icons/back_editor_muted.png':[23,23],
 'icons/back_nav_muted.png':[23,23],'icons/right_nav_muted.png':[23,23],
 'icons/delete_key_warm.png':[23,23],'icons/enter_key_warm.png':[23,23]
};
for(const [name,[w,h]] of Object.entries(images))test('approved V3 exact raster asset '+name,()=>{
 assert.ok(fs.existsSync(root+name),'missing approved raster '+name);
 const b=fs.readFileSync(root+name);assert.equal(b.subarray(1,4).toString(),'PNG');
 assert.equal(b.readUInt32BE(16),w);assert.equal(b.readUInt32BE(20),h);
 assert.ok(b.length>140,'nonempty glyph/icon image');
});

/* Design-only reference capture. Does not modify the tested application. */
export async function alignBaseline(c,width,height,displayDate){
 const clip=await c.eval(`(()=>{
  const frame=document.getElementById('watch-frame'),holder=document.getElementById('watch-holder'),watch=document.getElementById('watch');
  if(!frame||!holder||!watch)throw Error('Missing design-only watch frame');
  frame.style.transform='none';holder.style.width=${Number(width)+24}+'px';holder.style.height=${Number(height)+24}+'px';
  if(ui.page==='home'){
   const label=document.querySelector('#watch .head-small');
   if(label)label.textContent=${JSON.stringify(displayDate)};
  }
  watch.scrollIntoView({block:'center'});
  const r=watch.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1};
 })()`);
 if(Math.abs(clip.width-width)>0.05||Math.abs(clip.height-height)>0.05)throw Error('Reference active window dimensions drift: '+clip.width+'x'+clip.height);
 return clip;
}

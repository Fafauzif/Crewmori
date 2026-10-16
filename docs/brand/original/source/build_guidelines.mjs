import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

// Editable source. Geometry uses CSS pixels at 96dpi. Brand diagrams and
// application examples are native slide objects; supplied logo SVGs stay vector.
const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');
const WORK=process.env.CREWMORI_WORKSPACE || path.resolve(ROOT,'../..');
const BUILD=process.env.CREWMORI_BUILD_DIR || path.join(WORK,'tmp','brand-build');
const PREVIEW=path.join(BUILD,'previews');
await fs.mkdir(PREVIEW,{recursive:true});
const OUT=path.join(ROOT,'guide');await fs.mkdir(OUT,{recursive:true});
const C={forest:'#245C47',ivory:'#F5F3EC',paper:'#FFFEFA',ink:'#202A25',muted:'#566159',border:'#D9DED3',selected:'#E5EFE7',white:'#FFFFFF',black:'#000000',success:'#1E6848',successBg:'#EDF5EF',warning:'#80520B',warningBg:'#FFF1D6',error:'#9B3431',errorBg:'#FBE8E4',info:'#255F82',infoBg:'#E9F2F8'};
const ROLES=[['Scout','#F2C983','Opportunity fit'],['Promoter','#EFAF9B','Promotion drafts'],['Sales','#B9D8EC','Buyer conversations'],['Account Manager','#D3C6E7','Client relationships'],['Operations','#C6D4B5','Capacity and timing'],['Finance','#B6D9C6','Payment records']];
const SERIF='DejaVu Serif',SANS='DejaVu Sans';
const G=JSON.parse(await fs.readFile(path.join(ROOT,'assets','geometry.json'),'utf8'));
const cached={};
async function svgFile(rel){if(!cached[rel])cached[rel]=await fs.readFile(path.join(ROOT,'assets',rel),'utf8');return cached[rel];}
const p=Presentation.create({slideSize:{width:1440,height:810}});p.theme.defaultFont=SANS;
p.theme.colorScheme={name:'Crewmori',themeColors:{accent1:C.forest,accent2:'#F2C983',accent3:'#EFAF9B',accent4:'#B9D8EC',accent5:'#D3C6E7',accent6:'#C6D4B5',bg1:C.ivory,bg2:C.paper,tx1:C.ink,tx2:C.muted,dk1:C.ink,dk2:C.forest,lt1:C.white,lt2:C.ivory,hlink:C.forest,folHlink:C.muted}};
let n=0;const titles=[];const tablePages=[];
function box(s,x,y,w,h,fill=C.paper,stroke='none',r=0){return s.shapes.add({name:'surface',geometry:r?'roundRect':'rect',position:{left:x,top:y,width:w,height:h},fill,line:{style:'solid',fill:stroke,width:stroke==='none'?0:1},...(r?{borderRadius:r}:{})});}
function txt(s,value,x,y,w,h,size=24,color=C.ink,font=SANS,bold=false,align='left'){
 const q=s.shapes.add({name:'text-'+String(value).slice(0,24),geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{style:'solid',fill:'none',width:0}});
 q.text=value;q.text.style={fontSize:size,typeface:font,color,bold,alignment:align,verticalAlignment:'top',autoFit:'none',wrap:'square',insets:0};return q;
}
function rule(s,x1,y1,x2,y2,color=C.border,width=1){return s.shapes.add({name:'rule',geometry:'line',position:{left:x1,top:y1,width:x2-x1,height:y2-y1},fill:'none',line:{style:'solid',fill:color,width}});}
function circle(s,x,y,d,fill,stroke='none'){return s.shapes.add({name:'circle',geometry:'ellipse',position:{left:x,top:y,width:d,height:d},fill,line:{style:'solid',fill:stroke,width:stroke==='none'?0:1}});}
function page(title,section='Brand foundation',dark=false){const s=p.slides.add();n++;titles.push(title);s.background.fill=dark?C.forest:C.ivory;
 txt(s,section.toUpperCase(),64,34,1100,24,15,dark?C.ivory:C.muted,SANS,true);
 txt(s,title,64,78,1312,90,48,dark?C.white:C.ink,SERIF);
 rule(s,64,754,1376,754,dark?'#88AA98':C.border);
 txt(s,'Crewmori / Brand guidelines',64,770,1100,22,14,dark?C.ivory:C.muted);
 txt(s,String(n).padStart(2,'0'),1296,766,80,30,20,dark?C.ivory:C.muted,SANS,false,'right');
 s.speakerNotes.text='Crewmori identity guidelines v1.0, 16 October 2026. Original brand rules for the selected 02 Working Seam concept. Product basis: supplied handoff 00_START_HERE.md, 01_PRD.md and 06_DESIGN_AND_INTERACTIONS.md. Layout-depth reference: uploaded Brand Guideline 2026 PDF. Application examples are illustrative sample data, not live product evidence.';return s;
}
async function logo(s,x,y,w,kind='primary',color='green'){
 const name=kind==='primary'?'primary/crewmori-primary':kind==='stacked'?'stacked/crewmori-stacked':kind==='wordmark'?'wordmark/crewmori-wordmark':'symbol/crewmori-symbol';
 const svg=await svgFile(name+'-'+color+'.svg');const dims=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);const h=w*dims[3]/dims[2];
 s.images.add({svg,alt:'Crewmori '+kind+' logo '+color,fit:'contain',position:{left:x,top:y,width:w,height:h}});return {x,y,w,h};
}
async function alignedLogo(s,visibleLeft,y,w,color='green'){return logo(s,visibleLeft-22*w/G.horizontal.viewBox[2],y,w,'primary',color);}
function rawMarkSvg(color=C.forest){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="${color}" d="${G.raw_path}"/></svg>`;}
function mark(s,x,y,size,color=C.forest){return s.images.add({svg:rawMarkSvg(color),alt:'Working Seam construction',fit:'contain',position:{left:x,top:y,width:size,height:size}});}
async function image(s,rel,x,y,w,h,crop){const blob=await fs.readFile(path.join(ROOT,'assets',rel));return s.images.add({blob:new Uint8Array(blob),contentType:'image/png',alt:'Crewmori illustration direction study',fit:'contain',position:{left:x,top:y,width:w,height:h},...(crop?{crop}:{})});}
async function character(s,i,x,y,w,h){const cuts=[[40,360],[360,780],[790,1090],[1094,1430],[1445,1780],[1800,2140]];return image(s,'illustration-studies/six-coworkers-direction-study.png',x,y,w,h,{left:cuts[i][0]/2172,top:0.12,right:1-cuts[i][1]/2172,bottom:0.12});}
function tag(s,label,x,y,w,fg=C.forest,bg=C.selected){box(s,x,y,w,30,bg,'none',6);txt(s,label,x+10,y+5,w-20,22,15,fg,SANS,true);}
function button(s,label,x,y,w=180,fill=C.forest,color=C.white){box(s,x,y,w,44,fill,'none',8);txt(s,label,x+14,y+12,w-28,25,16,color,SANS,true,'center');}
function note(s,value,x=64,y=682,w=1312){txt(s,value,x,y,w,54,19,C.muted);}
function nativeTable(s,values,x,y,w,h,widths,size=20){
 tablePages.push(n);const t=s.tables.add({rows:values.length,columns:values[0].length,left:x,top:y,width:w,height:h,columnWidths:widths,values});
 t.borders.assign({style:'solid',fill:C.border,width:1});
 for(let r=0;r<values.length;r++){t.rows[r].height=h/values.length;for(let c=0;c<values[r].length;c++){const ce=t.getCell(r,c);ce.fill=r===0?C.forest:C.paper;ce.text.style={fontSize:size,typeface:SANS,color:r===0?C.white:C.ink,bold:r===0,insets:12,verticalAlignment:'middle'};}}
 return t;
}
function caption(s,title,body,x,y,w){txt(s,title,x,y,w,38,24,C.ink,SANS,true);txt(s,body,x,y+48,w,126,23,C.muted);}
function rgb(hex){const v=hex.slice(1);return [0,2,4].map(i=>parseInt(v.slice(i,i+2),16));}
function cmyk(hex){const [r,g,b]=rgb(hex).map(v=>v/255),k=1-Math.max(r,g,b);return k===1?[0,0,0,100]:[(1-r-k)/(1-k),(1-g-k)/(1-k),(1-b-k)/(1-k),k].map(v=>Math.round(v*100));}
function swatch(s,name,hex,x,y,w,h=220){box(s,x,y,w,h,hex);txt(s,name,x,y+h+18,w,64,22,C.ink,SANS,true);txt(s,hex,x,y+h+79,w,28,21,C.ink);txt(s,'RGB '+rgb(hex).join(' / '),x,y+h+113,w,28,17,C.muted);}

// 01 Cover
{
 const s=page('','Identity guidelines',true);await alignedLogo(s,80,202,1015,'white');
 txt(s,'Brand identity\nguidelines',76,495,1120,160,62,C.white,SERIF);
 txt(s,'Working Seam / Version 1.0 / October 2026',80,686,1200,30,22,C.ivory);
}
// 02 Contents
{
 const s=page('A system for everyday work');
 txt(s,'The logo stays consistent. The team brings it to life.',64,194,1200,50,30,C.forest,SERIF);
 const rows=[['01','Foundation','Purpose, audience, principles and voice','03-06'],['02','Logo system','Construction, clear space, variants and use','07-15'],['03','Visual system','Color, typography, layout and illustration','16-27'],['04','Applications','Product, documents, social and connected tools','28-38'],['05','Implementation','Assets, tokens and production handoff','39-40']];
 rows.forEach((r,i)=>{const y=286+i*76;txt(s,r[0],64,y,72,40,23,C.forest,SANS,true);txt(s,r[1],155,y,310,40,26,C.ink,SANS,true);txt(s,r[2],475,y+3,770,40,22,C.muted);txt(s,r[3],1260,y+3,116,40,20,C.muted,SANS,false,'right');rule(s,155,y+59,1376,y+59);});
}
// 03 Purpose
{
 const s=page('Your business team, with you in charge');
 txt(s,'Crewmori supports the business around\nyour commissioned professional work.',64,204,1250,155,47,C.forest,SERIF);
 txt(s,'Six specialists help find opportunities, prepare promotion, support sales, manage client relationships, coordinate operations and check payment records.',64,404,760,156,26);
 txt(s,'The freelancer performs the professional work and retains control over approval-required actions.',928,407,448,160,26,C.forest);
 rule(s,878,400,878,635);
 note(s,'Positioning: a freelancer-owned AI business team that turns delegated business tasks into useful, reviewable outputs.');
}
// 04 Audience/personality
{
 const s=page('Professional support with a human presence');
 caption(s,'For the independent professional','A capable team that feels approachable and respects the owner’s independence.',64,211,592);
 caption(s,'For the client','A clear business identity on proposals, invoices and pages that disclose an AI representative.',784,211,592);
 rule(s,64,419,1376,419);
 const a=[['Capable','Specific work and useful outputs'],['Companionable','Warmth without childishness'],['Clear','Readable terms and next actions'],['Accountable','Visible ownership and approvals']];
 a.forEach((r,i)=>{const x=64+i*334;txt(s,r[0],x,465,298,54,30,C.forest,SERIF);txt(s,r[1],x,535,290,100,23,C.muted);});
 note(s,'These are intended brand qualities, not claims of measured customer preference.');
}
// 05 Principles
{
 const s=page('Identity principles');
 const a=[['The owner remains visible','Place decisions, responsibility and approval controls where they can be understood.'],['Useful work leads','Show the artifact, its state and the next action. Keep technology claims secondary.'],['Personality has a place','Coworkers supply expression. The core mark remains stable and recognizable.'],['Calm design earns attention','Use hierarchy, space and one dominant action rather than constant animation.']];
 a.forEach((r,i)=>{const y=200+i*118;txt(s,'0'+(i+1),64,y+6,80,50,24,C.forest,SANS,true);txt(s,r[0],174,y,1110,48,30,C.ink,SERIF);txt(s,r[1],174,y+51,1160,60,23,C.muted);if(i<3)rule(s,174,y+98,1376,y+98);});
}
// 06 Voice
{
 const s=page('Voice and interface copy');
 txt(s,'Friendly, capable and factual. Name the output and the next useful action.',64,187,1280,55,26,C.forest);
 nativeTable(s,[['Situation','Approved example','Rule'],['Draft ready','Your proposal draft is ready to review.','Describe the artifact and its state.'],['Owner decision','Approve proposal v3 for Alex?','Name the version and destination.'],['Waiting for input','What delivery date can you commit to?','Ask one concrete question.'],['Handoff','Scout shared the brief with Sales.','Name sender, receiver and output.'],['Recovery','Scope changed. Review this version again.','Explain what needs attention.']],64,270,1312,360,[225,590,497],20);
 note(s,'“Saved”, “sent”, “connected” and “completed” appear only after the corresponding confirmed event. Buyer pages disclose AI representation.');
}
// 07 Logo divider
{
 const s=page('Logo system','Logo system',true);mark(s,870,192,460,C.white);
 txt(s,'Working Seam',64,267,770,100,68,C.white,SERIF);
 txt(s,'Two complementary bands.\nOne recognizable business identity.',68,407,760,142,31,C.ivory);
}
// 08 Primary
{
 const s=page('The primary logo','Logo system');await logo(s,116,192,1200);
 caption(s,'The visible idea','Two distinct contributions relate through one open seam. The construction suggests a coordinated handoff.',64,554,620);
 caption(s,'The brand relationship','The stable symbol sits beside an editorial wordmark. Coworkers add expression around the identity.',784,554,592);
}
// 09 Construction
{
 const s=page('Construction and proportion','Logo system');
 const x=106,y=221,z=3.5;for(let i=0;i<=10;i++){rule(s,x+i*35,y,x+i*35,y+350,'#E4E6DE');rule(s,x,y+i*35,x+350,y+i*35,'#E4E6DE');}mark(s,x,y,350);
 // x = thickness of horizontal ribbon: y12 to y34 in the raw path.
 rule(s,477,y+12*z,477,y+34*z,C.error,2);rule(s,465,y+12*z,490,y+12*z,C.error,2);rule(s,465,y+34*z,490,y+34*z,C.error,2);txt(s,'x',496,y+52,52,35,28,C.error,SERIF);
 txt(s,'x = 22 raw units',650,218,690,65,39,C.forest,SERIF);
 txt(s,'Measure x vertically across a horizontal band.\nThe visible symbol measures 84 × 76 units.',652,305,680,94,25);
 txt(s,'Horizontal gap: x\nWordmark cap height: 55% of symbol height\nRelationship between bands: 180° rotation',652,431,680,156,25,C.muted);
 note(s,'Use supplied artwork. The wordmark’s visible bounds are vertically centered against the symbol; its round-letter overshoot stays intact.');
}
// 10 Clear space
{
 const s=page('Clear space','Logo system');
 const x=108,y=270,w=1200,scale=w/G.horizontal.viewBox[2],u=22*scale;
 box(s,x,y,w,120*scale,'none',C.border);await logo(s,x,y,w);
 // Visible combined artwork bounds, based on geometry.json.
 box(s,x+u,y+u,407.2231748*scale,76*scale,'none','#AEBBB0');
 txt(s,'x',x+u/2-10,y+120*scale/2-18,40,40,28,C.error,SERIF);txt(s,'x',x+w-u/2-10,y+120*scale/2-18,40,40,28,C.error,SERIF);
 txt(s,'x',x+w/2-10,y+u/2-18,40,40,28,C.error,SERIF);txt(s,'x',x+w/2-10,y+120*scale-u/2-18,40,40,28,C.error,SERIF);
 txt(s,'Minimum clear space = one ribbon thickness',64,191,1280,55,30,C.forest,SERIF);
 note(s,'Measure from visible artwork, including the tips. Supplied production canvases already include x on every side. Text, images and characters stay outside it.',64,654);
}
// 11 Variants
{
 const s=page('The logo family','Logo system');
 await logo(s,51,213,760);await logo(s,962,190,358,'stacked');
 await logo(s,83,496,154,'symbol');await logo(s,427,511,560,'wordmark');
 txt(s,'Primary / horizontal',80,424,700,35,22,C.ink,SANS,true);txt(s,'Stacked',974,424,350,35,22,C.ink,SANS,true);
 txt(s,'Symbol',82,659,280,35,22,C.ink,SANS,true);txt(s,'Wordmark',453,659,650,35,22,C.ink,SANS,true);
 note(s,'Horizontal is the default. Use stacked for compact brand panels, symbol for constrained slots, and supplied wordmark only when the symbol already appears nearby.',64,704);
}
// 12 Min sizes
{
 const s=page('Minimum sizes and compact icons','Logo system');
 nativeTable(s,[['Version','Digital canvas','Print canvas'],['Primary / horizontal','200 px wide','45 mm wide'],['Stacked','160 px wide','35 mm wide'],['Wordmark','150 px wide','30 mm wide'],['Standard symbol','24 × 24 px','6 × 6 mm']],64,200,780,350,[330,225,225],22);
 txt(s,'Browser favicon',946,207,400,50,31,C.forest,SERIF);
 for(let i=0;i<3;i++){const size=[16,24,32][i],x=966+i*128;await image(s,`favicon/crewmori-favicon-${size}.png`,x,296,size,size);txt(s,String(size)+' px',x-10,353,100,35,20,C.muted);}
 txt(s,'Use supplied compact browser favicons at 16-64 px. These browser slots waive x internally. The minimum slot is 16 px.',946,414,400,146,23);
 note(s,'All sizes refer to the complete supplied canvas, including its built-in space. Print minima are conservative production recommendations. No path alteration is needed for the favicon.',64,620);
}
// 13 Logo colors
{
 const s=page('Approved logo colors and backgrounds','Logo system');
 const a=[[64,202,620,202,C.paper,'green','Forest on ivory or white'],[756,202,620,202,C.forest,'white','Reversed white on forest'],[64,450,620,202,C.white,'black','Black for single-color reproduction'],[756,450,620,202,C.ink,'white','Reversed white on plain ink']];
 for(const [x,y,w,h,bg,col,label]of a){box(s,x,y,w,h,bg);await logo(s,x+30,y+8,w-60,'primary',col);txt(s,label,x+32,y+h-42,w-64,30,19,col==='white'?C.white:C.muted);}
 note(s,'Pastels identify specialists, not alternate logo colors. Use a solid field behind the logo when imagery or texture would compete with its seam.');
}
// 14 Placement
{
 const s=page('Alignment and placement','Logo system');
 box(s,64,210,804,408,C.paper,C.border);rule(s,96,210,96,618,'#BCCABF',1);await alignedLogo(s,96,226,270);
 txt(s,'Your team’s briefing',96,330,700,70,43,C.forest,SERIF);txt(s,'A clear place for the work ahead.',96,422,680,60,25,C.muted);
 txt(s,'Visible artwork aligns with the content edge.',96,546,700,36,21,C.muted);
 caption(s,'Default placement','Top left on websites, documents, social posts and presentation covers. Align visible artwork, allowing for built-in space.',944,213,432);
 caption(s,'Centered exceptions','Social avatar, favicon and app icon tiles. Use the supplied square assets without moving individual bands.',944,448,432);
 note(s,'Edge margin = the larger of x or 5% of the composition’s short edge. Keep the same margin for logo, headline and supporting copy.');
}
// 15 Incorrect
{
 const s=page('Incorrect usage','Logo system');
 const base=await svgFile('primary/crewmori-primary-green.svg');
 const bad=[['Stretched proportions','stretch'],['Unapproved color','color'],['Rotation','rotation'],['Separated bands','split'],['Outlined artwork','outline'],['Crowded clear space','crowd']];
 for(let i=0;i<6;i++){const x=64+(i%3)*448,y=201+Math.floor(i/3)*245;box(s,x,y,416,194,C.paper);let svg=base;
  if(bad[i][1]==='stretch')svg=svg.replace(/viewBox="[^"]+"/,'viewBox="0 0 451.2231748 180"').replace('height="120"','height="180"').replace('<path','<g transform="scale(1 1.5)"><path').replace('</svg>','</g></svg>');
  if(bad[i][1]==='color')svg=svg.replaceAll(C.forest,'#B95E5A');
  if(bad[i][1]==='outline')svg=svg.replaceAll(`fill="${C.forest}"`,`fill="none" stroke="${C.forest}" stroke-width="0.8"`);
  if(bad[i][1]==='split'){const parts=G.raw_path.split('Z');svg=svg.replace(/<path[^>]*d="M12[^"]+"\/>/,`<g transform="translate(14 10)"><path fill="${C.forest}" d="${parts[0]}Z"/><path fill="${C.forest}" transform="translate(12 8)" d="${parts[1]}Z"/></g>`);}
  const im=s.images.add({svg,alt:'Incorrect logo example '+bad[i][0],fit:'contain',position:{left:x+24,top:y+44,width:368,height:98}});
  if(bad[i][1]==='stretch'){im.lockAspectRatio=false;im.frame={left:x+24,top:y+25,width:368,height:144};}
  if(bad[i][1]==='rotation')im.rotation=-12;
  if(bad[i][1]==='crowd')txt(s,'A headline touching the logo',x+27,y+105,370,48,24,C.ink,SANS,true);
  txt(s,'×',x+16,y+9,30,35,30,C.error);txt(s,bad[i][0],x+22,y+202,390,38,20,C.error,SANS,true);
 }
 note(s,'Also avoid shadows, gradients, cropping, adding a face, placing a character in the seam, or recreating the wordmark by typing it.');
}
// 16 Divider
{
 const s=page('Color and typography','Visual system',true);
 txt(s,'Warm surfaces.\nA clear working hierarchy.',64,242,1180,197,66,C.white,SERIF);
 const colors=[C.ivory,C.paper,'#F2C983','#EFAF9B','#B9D8EC','#D3C6E7','#C6D4B5','#B6D9C6'];colors.forEach((v,i)=>box(s,64+i*164,566,148,98,v));
}
// 17 Core palette
{
 const s=page('Core palette','Visual system');
 const a=[['Forest',C.forest],['Ivory',C.ivory],['Paper',C.paper],['Ink',C.ink],['Muted',C.muted],['Border',C.border]];
 a.forEach((r,i)=>{const x=64+i*222;swatch(s,r[0],r[1],x,211,202,210);txt(s,'CMYK '+cmyk(r[1]).join(' / '),x,589,202,56,16,C.muted);});
 note(s,'HEX and RGB are the digital source of truth. CMYK values are starting conversions from sRGB; a printer must convert for the chosen profile and proof on the actual stock.',64,654);
}
// 18 Agent palette
{
 const s=page('Specialist identity colors','Visual system');
 ROLES.forEach((r,i)=>{const x=64+i*222;swatch(s,r[0],r[1],x,218,202,200);txt(s,r[2],x,585,202,70,19,C.muted);});
 note(s,'Use Ink #202A25 for text on these tints. Keep the role name visible. Finance mint does not mean success; Promoter coral does not mean error.');
}
// 19 Status
{
 const s=page('Status colors','Visual system');
 const a=[['Success',C.success,C.successBg,'Saved','6.04:1'],['Warning',C.warning,C.warningBg,'Needs review','6.01:1'],['Error',C.error,C.errorBg,'Connection failed','6.06:1'],['Information',C.info,C.infoBg,'Queued','6.10:1']];
 a.forEach((r,i)=>{const x=64+i*334;box(s,x,214,310,198,r[2]);txt(s,['✓','!','×','i'][i],x+24,240,80,38,29,r[1],SANS,true);txt(s,r[3],x+24,280,260,70,25,r[1],SANS,true);txt(s,r[0],x,442,310,45,28,C.ink,SERIF);txt(s,'Text '+r[1]+'\nSurface '+r[2]+'\nContrast '+r[4],x,507,310,114,20,C.muted);});
 note(s,'State text is always required. Semantic color treatments also include an icon. Plain state text on a neutral surface is sufficient. Keep role tints separate.');
}
// 20 Contrast
{
 const s=page('Contrast and functional color','Visual system');
 nativeTable(s,[['Approved pair','Ratio','Use'],['Ink on Ivory','13.33:1','Body text and essential terms'],['Muted on Ivory','5.82:1','Supporting text'],['White on Forest','7.79:1','Primary buttons and reversed identity'],['Forest on Selected #E5EFE7','6.61:1','Selected navigation with a second cue'],['Border on Paper','1.36:1','Decoration only']],64,204,1312,365,[520,190,602],22);
 txt(s,'Internal targets',64,610,350,38,27,C.forest,SERIF);txt(s,'Normal text ≥ 4.5:1. Required UI boundaries and focus ≥ 3:1.\nUse Muted for input borders. Recheck transparency, imagery and actual rendered states.',446,608,930,96,23,C.muted);
}
// 21 Families
{
 const s=page('Typography families','Visual system');
 txt(s,'DejaVu Serif',64,208,640,85,56,C.forest,SERIF);txt(s,'A business team\nbehind your work.',64,327,650,156,44,C.ink,SERIF);
 txt(s,'Editorial display / Regular 400',64,545,650,38,22,C.muted);
 txt(s,'DejaVu Sans',800,210,576,74,46,C.forest,SANS,true);txt(s,'Your proposal draft is ready.\nReview the scope and choose\nwhat happens next.',800,330,570,147,29,C.ink);
 txt(s,'Interface and body / Regular 400, Bold 700',800,545,576,58,22,C.muted);
 note(s,'DejaVu fonts use the Bitstream Vera license; DejaVu changes are public domain. Install the included fonts for PowerPoint editing. The logo wordmark is an outlined asset.');
}
// 22 Hierarchy
{
 const s=page('Typography hierarchy','Visual system');
 nativeTable(s,[['Role','Family / weight','Size / line height','Use'],['H1','Serif Regular','44 / 52 px','Page title'],['H2','Serif Regular','32 / 40 px','Editorial section'],['H3','Sans Bold','24 / 32 px','Functional section'],['Body','Sans Regular','16 / 24 px','Reading and controls'],['Small','Sans Regular','14 / 20 px','Supporting labels'],['Metadata','Sans Regular','12 / 16 px','Timestamps and sources']],64,200,1312,406,[190,340,302,480],22);
 note(s,'Fallbacks: Georgia / Times New Roman for display; Arial / system-ui for Sans. At ≤768 px, H1 becomes 32/40 px. Use right-aligned tabular numerals for amounts.');
}
// 23 Spacing and grid
{
 const s=page('Spacing and grids','Visual system');
 const values=[4,8,12,16,24,32,48,64];values.forEach((v,i)=>{const x=64+i*164;box(s,x,231,v*1.8,90,C.forest);txt(s,String(v),x,345,130,42,26,C.ink,SANS,true);});
 txt(s,'4 px base unit',64,421,480,60,37,C.forest,SERIF);
 txt(s,'16 px between related controls\n24 px between card groups\n32 px between desktop sections',64,501,570,132,26);
 txt(s,'Desktop shell',800,421,500,50,33,C.forest,SERIF);
 txt(s,'224 px sidebar / 72 px header\n32 px workspace padding at ≥1280 px\n2:1 content columns / 24 px gutter\n24 px padding from 769-1279 px',800,501,570,156,26);
 note(s,'At ≤1024 px, collapse the context rail. At ≤768 px, use one content column, 16 px padding and bottom navigation with reserved safe-area space.');
}
// 24 Corners & controls
{
 const s=page('Corners, elevation and control states','Visual system');
 const a=[['Button / field','8 px',8],['Card','12 px',12],['Drawer','16 px',16]];
 a.forEach((r,i)=>{const x=64+i*448;box(s,x,216,416,198,C.paper,C.border,r[2]);txt(s,r[1],x+24,265,360,65,45,C.forest,SERIF);txt(s,r[0],x+24,349,360,36,22,C.muted);});
 const states=[['Default',C.forest,C.white],['Hover','#1B4B39',C.white],['Pressed','#153F30',C.white],['Disabled',C.border,C.muted]];
 states.forEach((r,i)=>{const x=64+i*268;button(s,'Review draft',x,493,238,r[1],r[2]);txt(s,r[0],x,554,238,34,21,C.muted);});
 box(s,1160,489,220,52,'none',C.forest,10);button(s,'Review draft',1164,493,212);txt(s,'Focus 2 px / offset 2 px',1129,554,247,64,20,C.muted);
 note(s,'Targets are at least 44 px high. Flat surfaces are the default; overlays alone use 0 8px 24px rgba(32,42,37,.10). Input boundaries use Muted.');
}
// 25 Illustration
{
 const s=page('Icon and illustration direction','Visual system');
 await image(s,'illustration-studies/six-coworkers-direction-study.png',64,215,1312,438);
 ROLES.forEach((r,i)=>txt(s,i===3?'Account\nManager':r[0],64+i*220,619,208,52,18,C.ink,SANS,true,'center'));
 txt(s,'ILLUSTRATION DIRECTION STUDY',64,180,1000,28,15,C.muted,SANS,true);
 note(s,'Stable role silhouettes, forest outlines and restrained pastel fills. Use a 24 px outline icon system with 2 px strokes and rounded joins. Character artwork shown here is a direction study.');
}
// 26 Logo with characters
{
 const s=page('One identity, six coworkers','Visual system');await logo(s,62,204,520);
 rule(s,64,399,1376,399);await image(s,'illustration-studies/six-coworkers-direction-study.png',64,424,1312,242);
 txt(s,'The logo owns the header. Coworkers occupy the working area.',682,230,666,100,31,C.forest,SERIF);
 note(s,'Keep every illustration outside the logo’s x clear space. Characters never replace a band, sit in the seam, wear the logo, or obscure prices, sources and approval controls.');
}
// 27 Motion
{
 const s=page('Motion follows meaningful work','Visual system');
 const a=[['01','Draft saved','Scout prepared a brief.'],['02','Handoff recorded','Scout shared it with Sales.'],['03','Review needed','The owner has a clear next action.']];
 a.forEach((r,i)=>{const x=64+i*448;txt(s,r[0],x,212,390,54,30,C.forest,SERIF);rule(s,x,288,x+400,288);txt(s,r[1],x,326,400,46,28,C.ink,SANS,true);txt(s,r[2],x,400,400,104,25,C.muted);});
 txt(s,'160-240 ms',64,578,510,62,41,C.forest,SERIF);txt(s,'At most two task-linked cursors.\nReduced motion uses static labeled focus and state updates.',640,578,736,100,26);
 note(s,'Default duration 200 ms; easing cubic-bezier(.2,0,0,1). Keep logo bands together. No idle typing, random cursor travel, looping bounce or simulated progress.');
}
// 28 Divider
{
 const s=page('Applications','Applications',true);await logo(s,70,239,1080,'primary','white');
 txt(s,'One system across the places work happens.',80,594,1240,74,40,C.ivory,SERIF);
}
// 29 Header
{
 const s=page('Website header','Applications');
 box(s,64,230,1312,350,C.paper,C.border);await alignedLogo(s,99,240,250);txt(s,'Product',693,272,150,30,19);txt(s,'How it works',863,272,180,30,19);button(s,'Open workspace',1133,258,214);rule(s,64,328,1376,328);
 txt(s,'A team behind your\nindependent business.',99,381,990,131,47,C.forest,SERIF);
 note(s,'Header height 72 px in the product. Primary logo canvas ≥200 px wide. Keep the brand at the left and a single dominant action at the right. Example shown at presentation scale.');
}
// 30 Sidebar and icons
{
 const s=page('Sidebar, favicon and app icon','Applications');
 box(s,64,210,280,460,C.paper,C.border);await alignedLogo(s,84,221,260);const nav=['Workspace','Opportunities','Clients','Team','Money'];nav.forEach((v,i)=>{if(i===0)box(s,84,324+i*56,238,44,C.selected,'none',8);txt(s,v,105,335+i*56,210,32,20,i===0?C.forest:C.muted,SANS,i===0);});
 txt(s,'Compact identity',448,215,850,60,39,C.forest,SERIF);
 for(let i=0;i<3;i++){const size=[16,24,32][i];await image(s,`favicon/crewmori-favicon-${size}.png`,470+i*120,326,size,size);txt(s,String(size)+' px',460+i*120,384,100,32,20,C.muted);}
 await image(s,'app-icon/crewmori-app-icon-512.png',1024,251,238,238);
 txt(s,'App tile',1048,515,260,40,26,C.ink,SANS,true);txt(s,'Ivory on Forest\nRadius 18.75% of tile\nVisible symbol width 65.625%',448,515,850,114,25,C.muted);
 note(s,'Desktop sidebar is 224 px; example is enlarged. Use supplied icon tiles. App icon padding is built in; apply platform masks without changing the mark.');
}

function miniLabel(s,v,x,y,w=160,col=C.muted){txt(s,v,x,y,w,28,15,col);}
async function shell(s,x,y,w,h,title){
 const k=w/1440;box(s,x,y,w,h,C.ivory,C.border,12);box(s,x,y,224*k,h,C.paper);await alignedLogo(s,x+32*k,y+10*k,200*k);
 ['Workspace','Opportunities','Clients','Team','Money'].forEach((v,i)=>{if(v===title)box(s,x+16*k,y+(118+i*52)*k,192*k,40*k,C.selected,'none',6);txt(s,v,x+32*k,y+(128+i*52)*k,174*k,28*k,16*k,v===title?C.forest:C.muted,SANS,v===title);});
 rule(s,x+224*k,y,x+224*k,y+h);miniLabel(s,'NOOR STUDIO',x+256*k,y+24*k,400*k);miniLabel(s,'Example / Sample data',x+1090*k,y+24*k,310*k);return {k,bx:x+256*k,by:y+90*k,x,y,w,h};
}
// 31 Home briefing
{
 const s=page('Home briefing','Applications');
 const q=await shell(s,64,196,1312,478,'Workspace'),{k,bx,by}=q;
 txt(s,'Good morning, Noor',bx,by,920*k,65*k,44*k,C.ink,SERIF);txt(s,'Your team has two drafts ready for review.',bx,by+70*k,920*k,40*k,17*k,C.muted);
 box(s,bx,by+134*k,720*k,194*k,C.paper,C.border,12);miniLabel(s,'TODAY’S FOCUS',bx+24*k,by+154*k,500*k);txt(s,'A new opportunity\nworth a closer look',bx+24*k,by+191*k,660*k,104*k,32*k,C.forest,SERIF);
 box(s,bx+744*k,by+134*k,360*k,194*k,C.paper,C.border,12);txt(s,'Needs your approval',bx+768*k,by+155*k,316*k,40*k,21*k,C.ink,SANS,true);txt(s,'Proposal draft v3\n2 assets / USD 450',bx+768*k,by+209*k,306*k,65*k,17*k,C.muted);button(s,'Review proposal',bx+768*k,by+278*k,312*k);
 await image(s,'illustration-studies/six-coworkers-direction-study.png',bx,by+332*k,1100*k,80*k);
 note(s,'Application study: serif greeting, quiet ivory canvas, useful artifacts, visible owner decision and a reserved coworker area. Characters remain secondary to the work.');
}
// 32 Team overview
{
 const s=page('Team Overview','Applications');const q=await shell(s,64,196,1312,478,'Team'),{k,bx,by}=q;
 txt(s,'Your team, at work',bx,by-2*k,1000*k,60*k,44*k,C.ink,SERIF);txt(s,'Six specialists supporting your business.',bx,by+62*k,1000*k,40*k,17*k,C.muted);
 const states=['Working','Draft ready','Resting','Waiting for input','Awaiting approval','Resting'];
 for(let i=0;i<6;i++){const xx=bx+(i%3)*374*k,yy=by+119*k+Math.floor(i/3)*162*k;box(s,xx,yy,350*k,142*k,C.paper,C.border,12);await character(s,i,xx+12*k,yy+10*k,90*k,118*k);txt(s,ROLES[i][0],xx+118*k,yy+24*k,220*k,54*k,18*k,C.ink,SANS,true);txt(s,states[i],xx+118*k,yy+88*k,220*k,36*k,15*k,C.muted);}
 note(s,'Every specialist retains a stable silhouette, role name and tint. State is written separately. Show “Resting” when no task is active. Illustration direction studies appear in this example.');
}
// 33 Proposal and invoice
{
 const s=page('Proposal and invoice headers','Applications');
 for(const [x,title]of [[64,'PROPOSAL'],[756,'INVOICE']]){box(s,x,202,620,450,C.paper,C.border);txt(s,'Noor Studio',x+36,221,550,50,34,C.ink,SANS,true);txt(s,'Business support by',x+36,284,550,25,16,C.muted);await alignedLogo(s,x+36,308,225);txt(s,title,x+36,389,550,40,26,C.ink,SANS,true);txt(s,'Prepared for Cedar Studio',x+36,443,550,29,20,C.muted);rule(s,x+36,486,x+584,486);}
 txt(s,'Motion design / 2 assets\nProposed fee: USD 450\nOwner approval before sending',100,513,530,106,23);
 txt(s,'Invoice example CM-001\nDeposit 60%: USD 270\nRemaining gross balance: USD 180',792,513,530,106,23);
 note(s,'Use the freelancer’s identity as the service provider. Crewmori may identify the supporting business team. On A4, use a primary logo canvas at least 45 mm wide. Sample data only.');
}
// 34 Social
{
 const s=page('Social profile and social posts','Applications');
 await image(s,'app-icon/crewmori-app-icon-512.png',64,238,220,220);txt(s,'Profile image',64,497,280,40,25,C.ink,SANS,true);txt(s,'Centered supplied tile.\nNo extra text or character.',64,556,290,90,22,C.muted);
 box(s,400,206,420,420,C.paper,C.border);await alignedLogo(s,430,222,225);txt(s,'Your business.\nYour team.',430,357,362,134,43,C.forest,SERIF);txt(s,'Crewmori',430,559,330,35,20,C.muted);
 box(s,884,206,492,420,C.forest);await alignedLogo(s,916,222,225,'white');txt(s,'Make room\nfor your work.',916,357,420,134,43,C.white,SERIF);txt(s,'A team behind your business.',916,559,420,40,21,C.ivory);
 note(s,'Posts keep the logo at the upper left, outside copy and imagery. Use solid approved backgrounds. Preserve at least x or 5% of the short edge as the outer margin.');
}
// 35 Presentation cover
{
 const s=page('Presentation cover','Applications');box(s,64,204,1312,470,C.forest);await alignedLogo(s,112,222,340,'white');
 txt(s,'A team behind\nindependent work',112,374,1160,161,61,C.white,SERIF);txt(s,'Presentation title / 2026',114,594,1100,40,24,C.ivory);
 note(s,'Use one display headline, one supporting line and the primary logo. Keep the cover calm; preserve the same visible-artwork alignment as other formats.');
}
// 36 Co-brand
{
 const s=page('Co-branding and connected tools','Applications');
 box(s,64,210,1312,186,C.paper,C.border);await logo(s,82,237,354);rule(s,481,246,481,351);txt(s,'PARTNER',560,265,500,64,42,C.muted,SANS,true);txt(s,'Co-branded example',1071,335,280,31,17,C.muted,SANS,false,'right');
 txt(s,'Partnership',64,442,480,48,31,C.forest,SERIF);txt(s,'Use approved partner artwork. Match optical weight, respect both clear-space rules, and leave at least 2x between visible marks.',64,510,585,142,24);
 txt(s,'Connected tools',784,442,570,48,31,C.forest,SERIF);txt(s,'Keep tool artwork separate and describe the actual connection. Support does not imply endorsement.',784,510,590,85,23);box(s,784,608,592,59,C.paper,C.border,8);box(s,800,621,32,32,'none',C.muted,4);txt(s,'Tool name',850,625,260,29,19,C.ink,SANS,true);tag(s,'i  Connected',1160,623,190,C.info,C.infoBg);
 note(s,'PARTNER and Tool name are artwork placeholders; the connection state is illustrative. Connected-tool marks never form a combined Crewmori logo.');
}
// 37 Format layouts
{
 const s=page('Horizontal, square and vertical layouts','Applications');
 const frames=[[64,226,620,348,'Horizontal'],[748,226,348,348,'Square'],[1154,226,222,394,'Vertical']];
 for(const [x,y,w,h,label]of frames){box(s,x,y,w,h,C.paper,C.border);const lw=Math.min(260,w*.77);await logo(s,x+w*.06-22*lw/451.223,y+h*.05-22*lw/451.223,lw);txt(s,'Your team.\nYour work.',x+w*.06,y+h*.39,w*.88,h*.40,Math.min(41,w*.10),C.forest,SERIF);txt(s,label,x,y+h+28,w,35,22,C.muted);}
 note(s,'Outer margin = max(x, 5% of the short edge). Keep the logo upper left, align visible artwork with the headline, and leave at least 25% free of content. Diagrams are schematic; apply minimum sizes to the final export.');
}
// 38 Dark
{
 const s=page('Light and dark brand applications','Applications');
 box(s,64,214,620,390,C.paper);await alignedLogo(s,100,231,330);txt(s,'A clear place\nfor your business.',100,375,545,130,45,C.forest,SERIF);
 box(s,756,214,620,390,C.forest);await alignedLogo(s,792,231,330,'white');txt(s,'A clear place\nfor your business.',792,375,545,130,45,C.white,SERIF);
 note(s,'Forest supports brand covers, social posts and approved dark fields. These examples do not establish a separate dark product theme. The application’s reading surfaces remain ivory.');
}
// 39 Assets
{
 const s=page('Asset and implementation map','Implementation');
 nativeTable(s,[['Need','Source','Implementation rule'],['Logo','assets/primary, stacked, symbol, wordmark','Use the supplied SVG or transparent PNG.'],['Favicon and app icon','assets/favicon and assets/app-icon','Use the native-size export for its slot.'],['Colors and type','tokens/crewmori-tokens.json and .css','Import tokens rather than sampling artwork.'],['Editable guideline','guide/Crewmori_Brand_Guidelines.pptx','Install the included fonts before editing.'],['Build sources','source/ and assets/geometry.json','Preserve coordinates and linked file structure.'],['Future product work','BRAND.md','Apply the same rules across screens.']],64,204,1312,410,[310,495,507],20);
 note(s,'The complete package includes this PDF, editable PowerPoint, vector masters, transparent exports, fonts and licenses, tokens, geometry and reproducible source files.');
}
// 40 Closing
{
 const s=page('','Implementation',true);await alignedLogo(s,80,225,1110,'white');txt(s,'Crewmori',80,558,1190,83,58,C.white,SERIF);txt(s,'Brand identity guidelines / Version 1.0 / October 2026',82,657,1230,42,23,C.ivory);
}

if(p.slides.items.length!==40)throw new Error('Expected 40 pages');
await fs.writeFile(path.join(BUILD,'slide-index.json'),JSON.stringify(titles.map((title,i)=>({page:i+1,title})),null,2));
// Save both requested formats from the same in-memory presentation.
const candidate=path.join(BUILD,'candidate.pptx');await (await PresentationFile.exportPptx(p)).save(candidate);console.log('PPTX candidate saved');
// PDF conversion uses the bundled LibreOffice runtime so the exported PPTX
// and PDF share the same editable source. All fonts are provided in assets/fonts.
for(let i=0;i<p.slides.items.length;i++){const slide=p.slides.items[i];const png=await p.export({slide,format:'png',scale:1});await fs.writeFile(path.join(PREVIEW,`page-${String(i+1).padStart(2,'0')}.png`),new Uint8Array(await png.arrayBuffer()));if(i%5===4)console.log('Rendered '+(i+1)+' / 40');}
const {finalizePresentation}=await import(pathToFileURL('/root/.codex/skills/builtins/presentations/container_tools/artifact_tool_utils.mjs').href);
const REV=process.env.CREWMORI_REVISION || 'v1';
const FINAL=path.join(OUT,'Crewmori_Brand_Guidelines-'+REV+'.pptx');
const result=await finalizePresentation({workspaceDir:WORK,candidatePath:candidate,finalPath:FINAL,pythonExecutable:process.env.CODEX_PRIMARY_RUNTIME_PYTHON,integrityValidatorPath:'/root/.codex/skills/builtins/presentations/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:'/root/.codex/skills/builtins/presentations/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','13716000,7715250','--validate-bullet-geometry','--validate-heading-fit',...[6,12,20,22,39].flatMap(v=>['--require-native-table-slide',String(v)])],explicitTotalSlideCount:40,requiredNativeTableOwnerSlides:[6,12,20,22,39],fontPolicy:{basis:'design',families:[SERIF,SANS]},verifyArtifactToolImport:true,receiptPath:path.join(BUILD,'finalization-'+REV+'.json')});
console.log(JSON.stringify({status:'done',pages:40,files:[FINAL,path.join(OUT,'Crewmori_Brand_Guidelines-'+REV+'.pdf')],result}));
const soffice=path.join(process.env.CODEX_PRIMARY_RUNTIME,'dependencies/bin/override/soffice');
console.log(execFileSync(soffice,['--headless','--convert-to','pdf','--outdir',OUT,FINAL],{encoding:'utf8'}));

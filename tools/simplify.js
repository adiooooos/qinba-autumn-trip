const fs=require('fs');
const src=fs.readFileSync('assets/js/routes.js','utf8');
const json=JSON.parse(src.replace(/^window\.ROUTE_LINES\s*=\s*/,'').replace(/;\s*$/,''));
function d2(p,a,b){const x=p[0],y=p[1];const dx=b[0]-a[0],dy=b[1]-a[1];
  if(dx===0&&dy===0)return Math.hypot(x-a[0],y-a[1]);
  let t=((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy); t=Math.max(0,Math.min(1,t));
  return Math.hypot(x-(a[0]+t*dx), y-(a[1]+t*dy));}
function dp(pts,eps){
  if(pts.length<3)return pts;
  let idx=0,max=0;
  for(let i=1;i<pts.length-1;i++){const d=d2(pts[i],pts[0],pts[pts.length-1]); if(d>max){max=d;idx=i;}}
  if(max>eps){const a=dp(pts.slice(0,idx+1),eps),b=dp(pts.slice(idx),eps);return a.slice(0,-1).concat(b);}
  return [pts[0],pts[pts.length-1]];
}
let before=0,after=0;
for(const k of Object.keys(json)){before+=json[k].path.length;json[k].path=dp(json[k].path,0.00018);after+=json[k].path.length;}
fs.writeFileSync('assets/js/routes.js','window.ROUTE_LINES = '+JSON.stringify(json)+';\n');
console.log('points',before,'->',after,'size',(fs.statSync('assets/js/routes.js').size/1024).toFixed(1)+'KB');

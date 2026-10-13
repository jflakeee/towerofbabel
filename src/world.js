// Independent mobile content. Values are not claims about the benchmark's rules.
export const DIFFICULTIES={normal:{name:'일반',hp:1,damage:1,speed:1,reward:1,loot:0},hard:{name:'어려움',hp:1.55,damage:1.3,speed:1.06,reward:1.6,loot:1},nightmare:{name:'악몽',hp:2.2,damage:1.6,speed:1.12,reward:2.3,loot:2}};
export function defaultJourney(){return {difficulty:'normal',mode:'tower',chaosDepth:1,chaosMaxDepth:1,unlockedDifficulty:0,chaosUnlocked:false};}
export function normalizeJourney(raw={}){const p=defaultJourney();p.unlockedDifficulty=Math.max(0,Math.min(2,Math.floor(Number(raw?.unlockedDifficulty)||0)));p.chaosUnlocked=raw?.chaosUnlocked===true;const depth=Math.max(1,Math.min(20,Math.floor(Number(raw?.chaosDepth)||1)));const legacyMax=Math.ceil(depth/5)*5;p.chaosMaxDepth=p.chaosUnlocked?Math.max(5,Math.min(20,Math.ceil((Number(raw?.chaosMaxDepth)||legacyMax)/5)*5)):1;p.chaosDepth=Math.min(depth,p.chaosMaxDepth);const keys=Object.keys(DIFFICULTIES);p.difficulty=keys.includes(raw?.difficulty)&&keys.indexOf(raw.difficulty)<=p.unlockedDifficulty?raw.difficulty:'normal';p.mode=raw?.mode==='chaos'&&p.chaosUnlocked?'chaos':'tower';return p;}
const rect=(x,y,w=44,h=64)=>({x,y,w,h});
const FLOOR_MAPS=[
 [rect(470,440),rect(1090,440),rect(470,1080),rect(1090,1080)],
 [rect(350,440,320,46),rect(930,440,320,46),rect(350,1100,320,46),rect(930,1100,320,46)],
 [rect(530,570,70,70),rect(1000,570,70,70),rect(530,1000,70,70),rect(1000,1000,70,70),rect(180,760,250,55),rect(1170,760,250,55)],
 [rect(400,300,50,380),rect(1150,920,50,380),rect(750,320,250,50),rect(600,1230,250,50)],
 [rect(470,470,160,55),rect(970,470,160,55),rect(470,1075,160,55),rect(970,1075,160,55),rect(300,720,55,160),rect(1245,720,55,160)]
 ];
export function obstaclesFor(floor){return FLOOR_MAPS[Math.max(0,Math.min(4,floor-1))];}
export const gameObstacles=game=>game.worldVersion===1?obstaclesFor(game.floor):[];
export function overlaps(x,y,r,o){const dx=x-Math.max(o.x,Math.min(o.x+o.w,x)),dy=y-Math.max(o.y,Math.min(o.y+o.h,y));return dx*dx+dy*dy<r*r;}
export function isWalkable(game,x,y,r=15){return x>=35&&x<=1565&&y>=35&&y<=1565&&!gameObstacles(game).some(o=>overlaps(x,y,r,o));}
export function moveEntity(game,entity,dx,dy){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/5));for(let i=0;i<steps;i++){const x=Math.max(35,Math.min(1565,entity.x+dx/steps)),y=Math.max(35,Math.min(1565,entity.y+dy/steps));if(isWalkable(game,x,entity.y,entity.r))entity.x=x;if(isWalkable(game,entity.x,y,entity.r))entity.y=y;}return entity;}
// First contact along a finite segment, normalized to [0, 1]. Infinity means no hit.
export function segmentCircleTime(a,b,center,r){
 const dx=b.x-a.x,dy=b.y-a.y,ox=a.x-center.x,oy=a.y-center.y,c=ox*ox+oy*oy-r*r;
 if(c<=0)return 0;const length=dx*dx+dy*dy;if(length===0)return Infinity;
 const projection=ox*dx+oy*dy,discriminant=projection*projection-length*c;if(discriminant<0)return Infinity;
 const t=(-projection-Math.sqrt(discriminant))/length;return t>=0&&t<=1?t:Infinity;
}
export function firstWallTime(game,a,b,r=0){
 let first=Infinity;
 for(const o of gameObstacles(game)){
  let lo=0,hi=1,hit=true;
  for(const [axis,min,max] of [['x',o.x-r,o.x+o.w+r],['y',o.y-r,o.y+o.h+r]]){
   const delta=b[axis]-a[axis];if(Math.abs(delta)<1e-9){if(a[axis]<min||a[axis]>max){hit=false;break;}}
   else{const t1=(min-a[axis])/delta,t2=(max-a[axis])/delta;lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>hi){hit=false;break;}}
  }
  if(hit)first=Math.min(first,lo);
 }
 return first;
}
export function clearLine(game,a,b,r=0){return firstWallTime(game,a,b,r)===Infinity;}
export function safeSpawn(game,x,y,r){if(isWalkable(game,x,y,r))return {x,y};for(let radius=20;radius<=250;radius+=20)for(let i=0;i<16;i++){const a=i*Math.PI/8,nx=x+Math.cos(a)*radius,ny=y+Math.sin(a)*radius;if(isWalkable(game,nx,ny,r))return {x:nx,y:ny};}return {x:800,y:800};}
function routeTarget(game,e,p){const cached=e.route;if(cached&&game.time<cached.until&&Math.hypot(p.x-cached.px,p.y-cached.py)<70&&Math.hypot(e.x-cached.x,e.y-cached.y)>8)return cached;
 const nodes=[{x:e.x,y:e.y},{x:p.x,y:p.y}];for(const o of gameObstacles(game)){const pad=e.r+3;for(const x of [o.x-pad,o.x+o.w+pad])for(const y of [o.y-pad,o.y+o.h+pad])if(isWalkable(game,x,y,e.r))nodes.push({x,y});}
 const scores=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),visited=new Set();scores[0]=0;for(let n=0;n<nodes.length;n++){let at=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(at<0||scores[i]<scores[at]))at=i;if(at<0||!Number.isFinite(scores[at]))break;if(at===1)break;visited.add(at);for(let i=1;i<nodes.length;i++)if(!visited.has(i)&&clearLine(game,nodes[at],nodes[i],e.r+1)){const score=scores[at]+Math.hypot(nodes[i].x-nodes[at].x,nodes[i].y-nodes[at].y);if(score<scores[i]){scores[i]=score;prev[i]=at;}}}
 let at=1;if(prev[at]<0)return p;while(prev[at]>0)at=prev[at];const target={...nodes[at],until:game.time+.8,px:p.x,py:p.y};e.route=target;return target;}
export function pursue(game,e,p,step){const target=clearLine(game,e,p,e.r+1)?p:routeTarget(game,e,p),dx=target.x-e.x,dy=target.y-e.y,d=Math.hypot(dx,dy)||1;moveEntity(game,e,dx/d*Math.min(step,d),dy/d*Math.min(step,d));}

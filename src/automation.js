import {SKILLS,clamp} from './engine.js';
export const STRATEGIES={balanced:'균형',survival:'생존',attack:'공격',farming:'파밍'};
export function rankChoices(game){
 const base={power:6,haste:5,fire:9,ice:5,lightning:9,orbit:7,magnet:4,vitality:3,crit:4};
 return game.choices.filter(id=>SKILLS.some(s=>s.id===id&&(game.skills[id]||0)<s.max)).map(id=>{
  let score=base[id],reason='현재 빌드의 전투 효율';const mode=game.autoStrategy||'balanced';
  if(id==='vitality'&&game.player.hp/game.player.maxHp<.45){score+=18;reason='부족한 체력 회복';}
  if(mode==='survival'&&['vitality','ice','orbit'].includes(id)){score+=7;reason='생존 우선 설정';}
  if(mode==='attack'&&['power','haste','fire','lightning','crit'].includes(id)){score+=5;reason='공격 우선 설정';}
  if(mode==='farming'&&id==='magnet'&&!game.bossSpawned){score+=12;reason='경험치 수집 우선 설정';}
  if(id==='magnet'&&game.bossSpawned)score-=8;
  if(id==='orbit'&&game.hero==='knight')score+=3;
  score+=(game.skills[id]||0)*.4;
  return {id,score,reason};
 }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
export function resolveChoices(game){
 const selected=[];while(game.state==='choosing'){
  const best=rankChoices(game)[0];if(!best)break;
  if(!game.choose(best.id))break;
  const entry={id:best.id,level:game.level,time:game.time,reason:best.reason};
  game.decisionLog||=[];game.decisionLog.push(entry);game.decisionLog=game.decisionLog.slice(-200);selected.push(entry);
 }return selected;
}
function danger(game,x,y){
 let score=0;for(const e of game.enemies){if(e.hp<=0)continue;const d=Math.hypot(x-e.x,y-e.y);score+=Math.max(0,e.r+game.player.r+30-d);
  if(e.telegraph>0&&e.telegraph<.4&&Math.hypot(x-e.targetX,y-e.targetY)<110)score+=180;
 }
 for(const b of game.enemyShots){if(b.life<=0)continue;const speed=b.vx*b.vx+b.vy*b.vy;if(!speed)continue;const t=clamp(((x-b.x)*b.vx+(y-b.y)*b.vy)/speed,0,.3);if(Math.hypot(x-b.x-b.vx*t,y-b.y-b.vy*t)<b.r+game.player.r+8)score+=50;}
 return score;
}
export function automateAbilities(game,input){
 if(game.state!=='playing')return;
 const p=game.player,near=game.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-p.x,e.y-p.y)<230);
 if(game.novaCd<=0&&(near.length>=4||(p.hp/p.maxHp<.35&&near.length>=2)||near.some(e=>e.type==='boss')))game.nova();
 if(game.state!=='playing'||game.dashCd>0||p.invulnerable>0||danger(game,p.x,p.y)<25)return;
 const mag=Math.hypot(input.x,input.y),dirs=[];if(mag)dirs.push({x:input.x/mag,y:input.y/mag});
 for(let i=0;i<8;i++)dirs.push({x:Math.cos(i*Math.PI/4),y:Math.sin(i*Math.PI/4)});
 let best=null,bestScore=Infinity;for(const [i,d] of dirs.entries()){
  const x=p.x+d.x*120,y=p.y+d.y*120;if(x<35||x>1565||y<35||y>1565)continue;
  const score=danger(game,x,y)+(mag&&i!==0?8:0);if(score<bestScore){best=d;bestScore=score;}
 }if(best&&bestScore<danger(game,p.x,p.y))game.dash(best);
}
export function combineDirections(directions){let x=0,y=0;for(const d of directions){x+=d.x;y+=d.y;}const mag=Math.hypot(x,y);return {x:mag?x/Math.max(1,mag):0,y:mag?y/Math.max(1,mag):0};}

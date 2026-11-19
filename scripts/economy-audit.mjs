import {makeLoot,seededRandom,costFor,UPGRADES} from '../src/engine.js';
const count=100000;
function sample(forceRare){const rng=seededRandom(20261120),rarity=[0,0,0,0,0];let liquidation=0;for(let i=0;i<count;i++){const item=makeLoot(1,rng,forceRare);rarity[item.rarity]++;liquidation+=10+item.rarity*15;}return {count,rarity,percent:rarity.map(n=>n/count*100),meanLiquidation:liquidation/count};}
const permanent=UPGRADES.map(u=>({id:u.id,cost:Array.from({length:u.max},(_,i)=>costFor(i)).reduce((a,b)=>a+b,0)}));
console.log(JSON.stringify({normal:sample(false),guaranteedRare:sample(true),permanent,assumptions:'floor 1 generator samples; hypothetical liquidation excludes equip locks and does not measure drops per minute or actual play'},null,2));

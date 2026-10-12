// Fixed-size counters: no per-frame arrays, network calls or identifying device data.
export class CombatDiagnostics {
 constructor(){this.start({});}
 start(context){this.context={...context};this.last=null;this.frames=0;this.elapsed=0;this.maxFrame=0;this.slowFrames=0;this.histogram=new Uint32Array(1001);this.peakEnemies=0;this.peakProjectiles=0;this.leftTouches=0;this.rightTouches=0;this.cancellations=0;this.interruptions=0;}
 interrupt(){this.last=null;this.interruptions++;}
 touch(x,width){if(x<width/2)this.leftTouches++;else this.rightTouches++;}
 cancel(){this.cancellations++;}
 frame(now,enemies=0,projectiles=0){
  if(!Number.isFinite(now))return;
  this.peakEnemies=Math.max(this.peakEnemies,enemies);this.peakProjectiles=Math.max(this.peakProjectiles,projectiles);
  const previous=this.last;this.last=now;if(previous===null||now<=previous)return;
  const ms=now-previous;this.frames++;this.elapsed+=ms;this.maxFrame=Math.max(this.maxFrame,ms);if(ms>50)this.slowFrames++;
  this.histogram[Math.min(1000,Math.ceil(ms))]++;
 }
 summary(){
  let total=0,p95=0;for(let i=0;i<this.histogram.length;i++){total+=this.histogram[i];if(total>=Math.ceil(this.frames*.95)){p95=i;break;}}
  return {...this.context,frames:this.frames,seconds:Math.round(this.elapsed)/1000,fps:this.elapsed?Math.round(this.frames*100000/this.elapsed)/100:null,p95ms:this.frames?p95:null,p95Capped:p95===1000,maxFrameMs:Math.round(this.maxFrame),slowFrames:this.slowFrames,peakEnemies:this.peakEnemies,peakProjectiles:this.peakProjectiles,leftTouches:this.leftTouches,rightTouches:this.rightTouches,cancellations:this.cancellations,interruptions:this.interruptions};
 }
}

// One captured finger owns movement until it is released or explicitly reset.
export class MobileJoystick {
 constructor(){this.reset();}
 reset(){this.pointerId=null;this.x=0;this.y=0;this.dx=0;this.dy=0;}
 begin(id,x,y,rect){
  if(this.pointerId!==null)return false;
  this.pointerId=id;this.cx=rect.left+rect.width/2;this.cy=rect.top+rect.height/2;
  this.radius=Math.max(1,Math.min(rect.width,rect.height)*.3);
  this.move(id,x,y);return true;
 }
 move(id,x,y){
  if(this.pointerId!==id||!Number.isFinite(x)||!Number.isFinite(y))return false;
  const dx=x-this.cx,dy=y-this.cy,distance=Math.hypot(dx,dy),fraction=Math.min(1,distance/this.radius);
  const ux=distance?dx/distance:0,uy=distance?dy/distance:0;
  this.dx=ux*fraction*this.radius;this.dy=uy*fraction*this.radius;
  const speed=Math.max(0,(fraction-.12)/.88);
  this.x=ux*speed;this.y=uy*speed;return true;
 }
 end(id){if(this.pointerId!==id)return false;this.reset();return true;}
}

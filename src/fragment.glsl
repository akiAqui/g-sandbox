precision mediump float;
varying vec2 vUv;
uniform vec2 resolution;
uniform float time;
void main() {
  vec2  cen =  vec2(sin(time)*0.1,cos(time)*0.1);
  vec2  pos = -1.0 + 2.0*gl_FragCoord.xy/resolution.xy;+cen;
  float theta = atan(pos.x, pos.y);
  float len = sin(theta*0.01);
  float r = cos(len*time); //*sin(len*30.0-time*time);
  float g = cos(len*time);
  float b = cos(len*time);
  gl_FragColor = vec4(r*r,r*r,r*r,1.0);
  
}

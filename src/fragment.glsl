precision mediump float;
varying vec2 vUv;
uniform vec2 resolution;
uniform float time;
void main() {
  vec2  cen =  vec2(sin(time)*0.1,cos(time)*0.1);
  vec2  pos = -1.0 + 2.0*gl_FragCoord.xy/resolution.xy;+cen;
  float len = length(pos);
  gl_FragColor = vec4(cos(len*11.0*time)*sin(len*30.0-time*time), cos(len*30.0*time), cos(len*51.0*time), 1.0); // 赤色
}


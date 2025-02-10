precision highp float;
varying vec2 vUv;
uniform vec2 resolution;
uniform float time;

float natan(float y, float x) {
  float PI  = 3.141592653589793;
  float angle = atan(y, x);  // 値域: [-π, π]
  angle = (angle < 0.0) ? (angle + 2.0 * PI) : angle;  // 値域: [0, 2π]
  return angle / (2.0 * PI);  // 正規化: [0, 1]
}
void main() {

  vec2  cen =  vec2(sin(time)*0.1,cos(time)*0.1);
  vec2  pos = -1.0 + 2.0*gl_FragCoord.xy/resolution.xy;+cen;
  float theta = atan(pos.x, pos.y);
  float len = length(pos);
  //float nl  = cos(len*time*0.01)/theta;
  //float nl  = cos(len*100.0)+theta;
  float theta2 = natan(pos.y,pos.x);
  float nl = cos(len*time+theta2*60000.0);
  //float p   = sin(theta*0.01);
  
  //float r = cos(len*1.3); //*sin(len*30.0-time*time);
  //float g = cos(sin(len*time)*cos(len))/abs(pos.x);
  //float b = cos(sin(len)*cos(len*time*time));
  //vec3 c = vec3(cos(nl),cos(nl),cos(nl));
  vec3 c = vec3(nl,nl,nl);
  //vec3  c = vec3(1.0, 0.7, 0.2);
  gl_FragColor = vec4(c,  1.0);
}



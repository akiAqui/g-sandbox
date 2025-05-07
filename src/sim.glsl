precision highp float;
uniform sampler2D uTex;
uniform vec2 uResolution;
varying vec2 vUv;
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec4 data = texture2D(uTex, uv);
  vec2 pos = data.xy;
  vec2 vel = data.zw;
  // 壁バウンス
  if (abs(pos.x) > 1.0) vel.x *= -1.0;
  if (abs(pos.y) > 1.0) vel.y *= -1.0;
  pos += vel;
  gl_FragColor = vec4(pos, vel);
}

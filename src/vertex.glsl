precision highp float;
attribute vec3 position;
uniform sampler2D uTex;
uniform vec2 uResolution;
varying vec3 vColor;
void main() {
  vec2 uv = position.xy * 0.5 + 0.5;
  vec4 data = texture2D(uTex, uv);
  vec2 pos = data.xy;
  gl_PointSize = 2.0;
  gl_Position = vec4(pos, 0.0, 1.0);
  vColor = vec3(1.0, 0.5, 0.2);
}

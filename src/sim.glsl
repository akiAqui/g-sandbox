precision highp float;
uniform sampler2D uTex;
uniform vec2 uResolution;
varying vec2 vUv;
float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
}
//float rand(vec3 co) {
//  return fract(sin(dot(co, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
//}
void main() {
  vec2 uv = (gl_FragCoord.xy + 0.5) / uResolution;
  vec4 self = texture2D(uTex, uv);
  vec2 pos = self.xy;
  vec2 vel = self.zw;
  // パラメータ
  float radius = 0.05;
  int steps = 5;
  vec2 avgPos = vec2(0.0);
  vec2 avgVel = vec2(0.0);
  vec2 separation = vec2(0.0);
  int count = 0;
  for (int dy = -5; dy <= 5; dy++) {
    for (int dx = -5; dx <= 5; dx++) {
      vec2 offset = vec2(float(dx), float(dy)) / uResolution;
      vec2 sampleUV = uv + offset;
      if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) continue;
      vec4 other = texture2D(uTex, sampleUV);
      vec2 op = other.xy;
      vec2 ov = other.zw;
      float d = distance(pos, op);
      if (d < radius && d > 0.0) {
        avgPos += op;
        avgVel += ov;
        separation += (pos - op) / (d + 0.01);
        count++;
      }
    }
  }
  if (count > 0) {
    avgPos /= float(count);
    avgVel /= float(count);
    vel += (avgPos - pos) * 7.2;      // cohesion    群れの中心に引かれる力
    vel += (avgVel - vel) * 0.15;     // alignment   近くのBoidと方向を整える
    vel += separation * 0.03;         // separation  近すぎるBoidを避ける反発力
  }
  float n = rand(uv + pos);
  vel += vec2(cos(n * 6.2831), sin(n * 6.2831)) * 0.001;
  if (pos.x < -1.0 || pos.x > 1.0) vel.x *= -1.0;
  if (pos.y < -1.0 || pos.y > 1.0) vel.y *= -1.0;
  float maxSpeed = 0.02;
  if (length(vel) > maxSpeed) vel = normalize(vel) * maxSpeed;
  pos += vel;
  gl_FragColor = vec4(pos, vel);
}

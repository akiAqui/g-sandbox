precision highp float;
uniform sampler2D uTex;
uniform vec2 uResolution;
varying vec2 vUv;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
  //vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 uv = (gl_FragCoord.xy + 0.5) / uResolution;
  vec4 data = texture2D(uTex, uv);
  vec2 pos = data.xy;
  vec2 vel = data.zw;
  // 境界：バウンス制御
  if (pos.x < -1.0 || pos.x > 1.0) vel.x *= -1.0;
  if (pos.y < -1.0 || pos.y > 1.0) vel.y *= -1.0;
  // Boids的な簡易ルール：中央に引かれる力（cohesion的）
  vec2 centerForce = -pos * 0.0001;
  vec2 noise = vec2(rand(uv + 0.001), rand(uv + 0.2)) * 1.89 - 1.0;
  vel += noise * 0.0025; // ← ランダムに揺らぎ追加
  vel += centerForce;
  // 速度制限
  float speed = length(vel);
  float maxSpeed = 0.02;
  if (speed > maxSpeed) {
    vel = normalize(vel) * maxSpeed;
  }
  pos += vel;
  gl_FragColor = vec4(pos, vel);
}

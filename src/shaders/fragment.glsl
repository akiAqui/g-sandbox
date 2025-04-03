uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform vec2 uMouseVelocity;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform vec3 uColorD;
uniform float uNoiseScale;
uniform float uNoiseIntensity;
uniform float uFluidIntensity;
uniform float uColorIntensity;

varying vec2 vUv;

// 2Dランダム関数
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 2Dノイズ関数
float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  
  // 4つの角でのランダム値
  float a = random(i);
  float b = random(i + vec2(1.0, 0.0));
  float c = random(i + vec2(0.0, 1.0));
  float d = random(i + vec2(1.0, 1.0));
  
  // スムーズな補間
  vec2 u = f * f * (3.0 - 2.0 * f);
  
  return mix(a, b, u.x) +
         (c - a) * u.y * (1.0 - u.x) +
         (d - b) * u.x * u.y;
}

// Fractional Brownian Motion (FBM)
float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  // オクターブを重ねる
  for (int i = 0; i < 6; i++) {
    value += amplitude * noise(st * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// 渦関数
vec2 vortex(vec2 uv, vec2 center, float strength, float speed) {
  vec2 delta = uv - center;
  float angle = atan(delta.y, delta.x);
  float len = length(delta);
  float vortexFactor = strength / (len + 0.001);
  
  float rotation = speed * uTime + vortexFactor;
  float cosR = cos(rotation);
  float sinR = sin(rotation);
  
  // 回転マトリックス
  vec2 rotated = vec2(
    cosR * delta.x - sinR * delta.y,
    sinR * delta.x + cosR * delta.y
  );
  
  return center + rotated;
}

// 反応拡散系シミュレーション
vec2 reactionDiffusion(vec2 uv) {
  vec2 px = vec2(1.0) / uResolution;
  float du = 0.1;  // 拡散率
  float dv = 0.05;
  float f = 0.055; // フィード率
  float k = 0.062; // 消費率
  
  // 流体の移動を表現
  float n1 = fbm(uv * 3.0 + uTime * 0.1);
  float n2 = fbm(uv * 2.0 - uTime * 0.15);
  
  // マウスの動きによる影響を追加
  float mouseInfluence = length(uMouse - uv) < 0.1 ? 0.8 : 0.0;
  
  return vec2(n1, n2) + mouseInfluence * uMouseVelocity;
}

// カラーグラデーションを計算
vec3 calculateColor(float value) {
  // 値に基づいて4つの色の間を補間
  vec3 color = mix(uColorA, uColorB, smoothstep(0.0, 0.33, value));
  color = mix(color, uColorC, smoothstep(0.33, 0.66, value));
  color = mix(color, uColorD, smoothstep(0.66, 1.0, value));
  
  // 色の彩度と明るさを調整
  color = pow(color, vec3(0.9)) * uColorIntensity;
  
  return color;
}

void main() {
  // アスペクト比を考慮したUV座標
  vec2 uv = vUv;
  
  // マウスの影響を取り入れた渦の中心を計算
  vec2 vortexCenter = vec2(
    0.5 + 0.05 * sin(uTime * 0.3),
    0.5 + 0.05 * cos(uTime * 0.3)
  );
  vortexCenter = mix(vortexCenter, uMouse * 0.5 + 0.5, length(uMouseVelocity) * 2.0);
  
  // 複数の渦を適用
  vec2 distortedUv = uv;
  distortedUv = vortex(distortedUv, vortexCenter, 0.3, 0.2);
  distortedUv = vortex(distortedUv, vec2(0.7, 0.3), 0.2, -0.1);
  distortedUv = vortex(distortedUv, vec2(0.3, 0.7), 0.15, 0.15);
  
  // FBMノイズを使って流体のようなパターンを生成
  float noiseValue = fbm(distortedUv * uNoiseScale + uTime * 0.05);
  
  // 反応拡散システムを適用
  vec2 reaction = reactionDiffusion(distortedUv);
  distortedUv += reaction * uFluidIntensity;
  
  // 追加のノイズレイヤーを重ねる
  float noiseLayer1 = fbm(distortedUv * 2.5 - uTime * 0.03);
  float noiseLayer2 = fbm(distortedUv * 3.5 + uTime * 0.02);
  float noiseLayer3 = fbm(distortedUv * 5.0 - vec2(noiseLayer1, noiseLayer2) * 0.4);
  
  // 複数のノイズを組み合わせて複雑なパターンを作成
  float finalNoise = mix(
    noiseValue,
    noiseLayer1 * 0.5 + noiseLayer2 * 0.3 + noiseLayer3 * 0.2,
    0.7
  );
  
  // マウスの動きに応じて揺らぎを追加
  finalNoise += length(uMouseVelocity) * 0.5 * smoothstep(0.3, 0.0, length(uv - uMouse * 0.5 - 0.5));
  
  // 最終的な色を計算
  vec3 finalColor = calculateColor(finalNoise);
  
  // 微妙な光の効果を追加
  float lightIntensity = pow(noiseLayer3, 3.0) * 0.5;
  finalColor += lightIntensity * vec3(1.0, 0.9, 0.7);
  
  // 最終的な色を出力
  gl_FragColor = vec4(finalColor, 1.0);
}

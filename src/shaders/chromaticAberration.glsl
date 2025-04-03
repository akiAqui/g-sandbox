uniform sampler2D tDiffuse;
uniform float uStrength;
uniform vec2 uResolution;

varying vec2 vUv;

void main() {
  // 画面の中心からの距離に基づいてディスプレイスメントを計算
  vec2 center = vec2(0.5);
  vec2 direction = normalize(vUv - center);
  float distance = length(vUv - center);
  
  // 色収差の強度を距離に応じて調整（中心から離れるほど強くなる）
  float aberration = uStrength * distance;
  
  // 各チャンネルで少しずつ異なるサンプリング位置を計算
  vec2 redUv = vUv - direction * aberration * 1.0;
  vec2 greenUv = vUv;
  vec2 blueUv = vUv + direction * aberration * 1.0;
  
  // 各チャンネルのサンプリング
  float r = texture2D(tDiffuse, redUv).r;
  float g = texture2D(tDiffuse, greenUv).g;
  float b = texture2D(tDiffuse, blueUv).b;
  float a = texture2D(tDiffuse, vUv).a;
  
  // RGBチャンネルを組み合わせて最終的な色を作成
  gl_FragColor = vec4(r, g, b, a);
}

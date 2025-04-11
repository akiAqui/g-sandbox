// fragment.glsl
#ifdef GL_ES
precision mediump float;
#endif

uniform float iTime;
uniform vec3 iResolution;

#define PI 3.14159265359

mat2 rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float sdCappedCylinder(vec3 p, float h, float r) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float petal(vec3 p) {
  float angleOffset = sin(iTime * 0.5) * 0.3;

  // XY平面上で点 p をPI/6（=30度）回転（+時間変化付き）, 花びらの傾き
  p.xy *= rot(PI / 6.0 + angleOffset);


  // X軸方向で左右対称化（負のX側を正に折り返す）。
  // 目的：花びら形状を一方向にまとめる（対称性を保つ）。
  // でも、6回回転させるのだから今回は冗長
  // p.x = abs(p.x);

  // x位置に応じてZ軸方向に曲げを加える値を計算（=湾曲パターン）。
  // 目的：花びらの中央がZ軸方向にカーブするような効果。
  float zCurve = sin(p.x * 10.0 + iTime * 0.9) * 0.2;

  // 前行で求めた湾曲量 zCurve によってZ軸を変形。
  // 結果：Xに沿ってZ方向に波打つような形状。
  p.x -= zCurve;
  p.z -= zCurve*0.2;

  // SDFの境界ボックスサイズ（時間要素ありだが無視）。
  // 目的：花びらの基本サイズ（XYZ方向）を指定。
  vec3 b = vec3(0.05 + 0.03 * sin(iTime * 1.3), 0.1 + 0.1 * sin(iTime * 0.7), 0.2 + 0.1 * sin(iTime * 2.3));
  //vec3 b = vec3(0.05,0.1,0.2);

  // 形状構築の要。
  // SDF手法で「角が丸いボックス型の穴（凹み）」を定義：
  // abs(p - vec3(0.0))：中心を原点としたボックス的構造
  // max(..., b) - b：bを超える距離だけを抽出 → b内部ならゼロ
  // length(...) - 0.01：ボックスの「膨らみ」で表面を決定（0.01で形を鋭く）
  float d = length(max(abs(p - vec3(0.0)), b) - b) - 0.01;
  
  return d;
}

float sphere(vec3 p, float r) {
  return length(p) - r;
}

float cylinder(vec3 p, float h, float r) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return max(d.x, d.y);
}

float disc(vec3 p) {
  p.z = 0.0;
  return length(p.xy) - 0.3;
}

// i番目の球のpulse
// 
float pulse(int i){
  float totalCycleTime = 3.0;        // 全体1サイクル
  float eachPulseDuration = 1.7;     // 1球の拍動の長さ
  float interval = 0.1;              // 拍動開始の間隔（重ねる）
  float localTime = mod(iTime, totalCycleTime);
  float pulseStart = float(i) * interval;
  float pulseEnd = pulseStart + eachPulseDuration;

  float pulse = (localTime >= pulseStart && localTime < pulseEnd)
    ? pow(1.0 - (localTime - pulseStart) / eachPulseDuration, 6.0)
    : 0.0;
  
  return pulse;
  
}

float map(vec3 p) {
  float d = 100.0;

  for (int i = 0; i < 6; i++) {
    float a = float(i) / 6.0 * PI * 2.0;
    vec3 pp = p;
    pp.xy *= rot(a);
    d = min(d, petal(pp));
  }
  
  int num_of_sphere = 9;
  for (int i = 0; i < num_of_sphere; i++) {
    float a = float(i) / float(num_of_sphere) * PI * 2.0 + iTime * 0.1; // 各sphereの中心からの角度
    vec3 ps = p - vec3(0.1 * cos(a), 0.1 * sin(a), 0.3);                // 極座標的にx,yで中心位置を計算
    float pulse=pulse(i);
    float r = 0.01 + 0.03 * pulse;

    d = min(d, sphere(ps, r));
  }

  // パイプ部分は不要ならコメントのままでOK（ステップ実装時に再有効化）
  /*
  for (int i = 0; i < 12; i++) {
    float a = float(i) / 12.0 * PI * 2.0;
    vec3 tp = p;
    tp.xz *= rot(a);
    float offset = sin(iTime * 0.3 + float(i)) * 0.3;
    tp.yz *= rot(offset);
    tp.x *= 0.3;
    tp.y -= 0.6;
    d = min(d, sdCappedCylinder(tp, 0.6, 0.015));
  }
  */

  return d;
}
// 曲率を計算する関数
float curvature(vec3 p) {
  float e = 0.001;
  float d = map(p);
  float dx = map(p + vec3(e, 0.0, 0.0));
  float dy = map(p + vec3(0.0, e, 0.0));
  float dz = map(p + vec3(0.0, 0.0, e));
  return (dx + dy + dz - 3.0 * d);
}

// 鏡面販社のために垂直ベクトルを取っている
//
vec3 getNormal(vec3 p) {
  float e = 0.001;
  vec2 h = vec2(1.0, -1.0) * e;
  return normalize(h.xyy * map(p + h.xyy) +
                   h.yyx * map(p + h.yyx) +
                   h.yxy * map(p + h.yxy) +
                   h.xxx * map(p + h.xxx));
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;
  uv*=2.1;
  vec3 ro = vec3(0.0, 0.0, 0.5);
  vec3 rd = normalize(vec3(uv, -1.5));
  float epsilon=0.00000001; //この値で図形の精度が決まるので、荒くすると鏡面ではなくなる
  
  float t = 0.0;
  float d;
  vec3 p;
  for (int i = 0; i < 128; i++) {
    p = ro + t * rd;
    d = map(p);
    if (d < -epsilon) break;
    if (d < +epsilon) break;
    t += d;
  }

  vec3 col = vec3(0.0);
  if (d < 0.01) {
    vec3 n = getNormal(p);
    float k = curvature(p);
    float kNorm = clamp(k * 1000.0, 0.0, 1.0);

    vec3 light = normalize(vec3(1.0, 1.0, 1.0));
    vec3 view = normalize(ro - p);
    vec3 halfVec = normalize(light + view);

    float diff = max(dot(n, light), 0.0);
    float spec = pow(max(dot(n, halfVec), 0.0), 100.0);
    vec3 base = vec3(kNorm + 0.3);
    vec3 lit = base * diff + vec3(1.0) * spec;

    // --- 鏡面反射を追加 ---
    vec3 reflectDir = reflect(-view, n);
    vec3 envColor = mix(vec3(0.2, 0.4, 0.6), vec3(0.8, 0.9, 1.0), reflectDir.y * 0.5 + 0.5);
    col = mix(lit, envColor,1.9); // 反射色を40%合成
  }

  gl_FragColor = vec4(0.2 + 0.8 * col, 1.0);
}


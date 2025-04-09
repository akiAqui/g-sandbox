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

// 花びら形状に反りと厚みを追加＋開閉アニメーション
float petal(vec3 p) {
  float angleOffset = sin(iTime * 0.5) * 0.3;
  p.xy *= rot(PI / 6.0 + angleOffset);
  p.x = abs(p.x);
  float zCurve = sin(p.x * 10.0+iTime*0.9) * 0.1;
  p.z -= zCurve;
  vec3 b = vec3(0.05+0.03*sin(iTime*1.3), 0.1+0.1*sin(iTime*0.7), 0.2+0.1*sin(iTime*2.3));
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



float map(vec3 p) {
  float d = 100.0;

  
  for (int i = 0; i < 6; i++) {
    float a = float(i) / 6.0 * PI * 2.0;
    vec3 pp = p;
    pp.xy *= rot(a);
    d = min(d, petal(pp));
  }

  
  for (int i=0; i<6; i++){
    float a = float(i) / 6.0 * PI * 2.0+iTime*0.1;    
    vec3 ps = p - vec3(0.1*cos(a), 0.1*sin(a), 0.3); // カメラ方向（-Z）に0.3シフト
    d = min(d, sphere(ps, 0.02+0.01*sin(iTime))); // sphere関数は原点中心に指定半径の球を描く関数
  }


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

float curvature(vec3 p) {
  float e = 0.001;
  float d = map(p);
  float dx = map(p + vec3(e, 0.0, 0.0));
  float dy = map(p + vec3(0.0, e, 0.0));
  float dz = map(p + vec3(0.0, 0.0, e));
  return (dx + dy + dz - 3.0 * d);  // 曲率の近似
}




vec3 getNormal(vec3 p) {
  float e = 0.001;
  vec2 h = vec2(1.0, -1.0) * e;
  return normalize(h.xyy * map(p + h.xyy) +
                   h.yyx * map(p + h.yyx) +
                   h.yxy * map(p + h.yxy) +
                   h.xxx * map(p + h.xxx));
}

void main() {
  // uv: スクリーン座標を正規化
  vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / iResolution.y;

  // ro: カメラ位置
  //vec3 ro = vec3(0.0, 0.0, 2.5 - iTime * 0.2); // カメラが奥に進む
  vec3 ro = vec3(0.0, 0.0, 0.5); // カメラが奥に進む

  // そのピクセルから伸びるRayの方向
  vec3 rd = normalize(vec3(uv, -1.5));

  // t: Rayの長さ、どこまで進んだか
  float t = 0.0;
  float d;
  vec3 p;
  for (int i = 0; i < 64; i++) {
    p = ro + t * rd;      // カメラからtだけ進んだ点
    d = map(p);           // その点から物体までの最短距離(SDF)
    if (d < 0.001) break; // 距離が非常に小さいので衝突と判定
    t += d;               // まだ遠い、距離分前進して次のチェックへ
  }


  
  vec3 col = vec3(0.0);
  if (d < 0.01) {
    vec3 n = getNormal(p);
    float k = curvature(p);
    float kNorm = clamp(k*1000.0, 0.0, 1.0);
    vec3 light = normalize(vec3(1.0, 1.0+0.1*sin(iTime), 1.0));
    vec3 view = normalize(ro - p);      
    //float diff = clamp(dot(n, light), 0.0, 1.0);
    vec3 halfVec = normalize(light + view);

    float diff = max(dot(n, light), 1.0);  
    float spec = pow(clamp(dot(n, halfVec), 0.0, 1.0), 100.0); // ← 64で鋭い光沢
    vec3 base = vec3(kNorm+0.3);
    col = base * diff + vec3(1.0) * spec;


    
    // 単色　col = vec3(0.9 , 0.9, 0.9) * diff;
    //col=vec3(kNorm+0.3);
    //col = mix(vec3(1.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0), kNorm);
  }

  gl_FragColor = vec4(0.2+0.8*col, 1.0);



}


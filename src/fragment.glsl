precision highp float;

uniform bool  uAxis;
uniform vec2  uResolution;
uniform vec3  uCameraPos;
uniform vec3  uTarget;
uniform bool  uLowQuality;

out vec4 outColor;

/*
  視点移動時の他の最適化要素
  - sceneSDFで描画対象を減らす
  - normalの計算と影の計算はしない
  - 形状を簡略形状に置き換える（かなり面倒くさいが）
  - もし、テクスチャを張るなら省略する
 */

#define PI 3.141562
#define HIGH_QUALITY_STEPS 256
#define LOW_QUALITY_STEPS 20
#define HIGH_QUALITY_MAXDIST 10.0
#define LOW_QUALITY_MAXDIST   8.0
#define HIGH_QUALITY_SURFDIST 0.00001
#define LOW_QUALITY_SURFDIST  0.1
#define MIN_STEP 0.001
#define MAX_STEP 0.2


//
// ノイズ関連
//
float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
    );
}
float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 5; i++) {
        value += amp * noise(p * freq);
        freq *= 2.0;
        amp *= 0.5;
    }
    return value;
}
float sdBoxWobble(vec3 p, vec3 center, vec2 size, float wobbleScale, float wobbleFreq, float thickness) {
    vec2 q = p.xy - center.xy;
    float base = sdBox(q, size);
    float edgeInfluence = smoothstep(0.05, 0.0, abs(base));
    float n = fbm(q * wobbleFreq) * 2.0 - 1.0;
    float dXY = base + n * wobbleScale * edgeInfluence;
    float dZ  = abs(p.z - center.z) - thickness * 0.5;
    return max(dXY, dZ);
}

// z軸周り回転(2x2行列)
//  c -s
//  s  c
mat2 rotZ(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

// x軸廻りの回転(3x3行列)
mat3 rotX(float a) {
  float c = cos(a), s = sin(a);
  return mat3(
    1.0, 0.0, 0.0,
    0.0,    c, -s,
    0.0,    s,  c
  );
}

// y軸廻りの回転(3x3行列)
mat3 rotY(float a) {
  float c = cos(a), s = sin(a);
  return mat3(
     c, 0.0, s,
    0.0, 1.0, 0.0,
    -s, 0.0, c
  );
}

//
// 各種sdfオブジェクトの定義
//


//
// 座標軸を描く
//
float axis(vec3 p) {
    float inf = 1e5;
    float r = 0.04;
    float len = 2.0;
    float marker_r=0.05;
    // 軸（シリンダー）
    float x = (abs(p.x) <= len) ? length(vec2(p.y, p.z)) - r : inf;
    float y = (abs(p.y) <= len) ? length(vec2(p.x, p.z)) - r : inf;
    float z = (abs(p.z) <= len) ? length(vec2(p.x, p.y)) - r : inf;
    float dx = x;
    float dy = y;
    float dz = z;
    {// === X軸: 1個 ===
        vec3 center = vec3(len + marker_r, 0.0, 0.0);
        dx = min(dx, length(p - center) - marker_r);
    }
    {// === Y軸: 2個 ===
        float h = marker_r * 1.5; // 間隔指定（任意調整可能）
        for (int i = 0; i < 2; i++) {
            float offset = h * (float(i) + 0.01);
            vec3 center = vec3(0.0, len + offset, 0.0);
            dy = min(dy, length(p - center) - marker_r);
        }
    }
    {// === Z軸: 3個 ===
        float h = marker_r * 1.5;
        for (int i = 0; i < 3; i++) {
            float offset = h * (float(i) + 0.5);
            vec3 center = vec3(0.0, 0.0, len + offset);
            dz = min(dz, length(p - center) - marker_r);
        }
    }
    return min(min(dx, dy), dz);
}

// 半球
float hemiSphere(vec3 p, vec3 c, float r, float phiX) {
  vec3 q=p-c;
  q=rotX(phiX)*q;
  float sphere = length(q) - r;
  float cap = -q.y; // y < 0 を削る（下半分を切る）
  return max(sphere, cap);
}

float spiralTube(vec3 p, vec3 center, float radius, float pitch, float tubeRadius, float phi) {
    vec3 q = p - center;
    q.xy*=rotZ(-phi);
    float angle = atan(q.y, q.x); // xy平面上の角度、z軸上の巻上りはこの角度で制御
    // Step 2: angle から spiral 軸上の位置を定義
    angle = mod(angle + 6.2831853, 6.2831853); // [0, 2pi]
    float spiralZ = pitch*angle;
    float spiralAngle = angle;

    // Step 3: 螺旋軌道上の中心点
    vec3 spiralCenter = vec3(
                             radius * cos(spiralAngle),
                             radius * sin(spiralAngle),
                             spiralZ
                             );

    // Step 4: チューブの断面との距離（SDF）
    return length(q - spiralCenter) - tubeRadius;
}

//
// beanCurve曲線の実装
//

// beanCurvePlane
// XY平面上にbean型曲線を描き、Z軸方向に薄い厚みを持たせた断面体（板状）のSDF
float beanCurvePlane(vec3 p, vec3 center, float a, float thickness) {
  vec3 q=p-center;
    float x = q.x;
    float y = q.y;

    float f = pow(x, 4.0) + x * x * y * y + pow(y, 4.0) - a * x *(x * x + y * y);
    float df = length(vec2(
        4.0 * pow(x, 3.0) + 2.0 * x * y * y - a * (3.0 * x * x + y * y),
        2.0 * x * x * y + 4.0 * pow(y, 3.0) - 2.0 * a * x * y
    ));

    float dXY = f / df;              // ← 符号付きで返す！
    float dZ  = abs(p.z) - thickness * 0.5;
    return max(dXY, dZ);
}
// beanCurveZ
// XY平面上のbean型曲線の内側にZ方向の高さを加え、輪郭に沿って盛り上がる豆型体積を表すSDF（Z方向に盛る）
float beanCurveZ(vec3 p, vec3 center, float a) {
  vec3 q = p - center;
  q.xy *=rotZ(-3.2);
  float x = q.x;
  float y = q.y;
  float f = pow(x, 4.0) + x*x*y*y + pow(y, 4.0) - a * x * (x*x + y*y);
  float r = abs(f); // 曲線の高さ

    // XY方向の距離（2Dで定義したSDF）
    float dXY = abs(f) / length(vec2(
        4.0*pow(x,3.0) + 2.0*x*y*y - a*(3.0*x*x + y*y),
        2.0*x*x*y + 4.0*pow(y,3.0) - 2.0*a*x*y
    ));

    // Z方向の高さを SDF に反映
    float dZ = abs(p.z - center.z) - max(r, 0.1);


    return max(dXY, dZ); // XYとZのSDFを合成 → bean型体積
}
// beanCurve2D
// XY平面上で定義されるbean型曲線の2D SDF（距離関数）。厚みのない純粋な2D曲線としての定義
float beanCurve2D(vec2 p, float a) {
    float x = p.x;
    float y = p.y;
    float f = pow(x, 4.0) + x * x * y * y + pow(y, 4.0) - a * x * (x * x + y * y);
    float df = length(vec2(
        4.0 * pow(x, 3.0) + 2.0 * x * y * y - a * (3.0 * x * x + y * y),
        2.0 * x * x * y + 4.0 * pow(y, 3.0) - 2.0 * a * x * y
    ));
    return abs(f) / df; // 勾配で正規化して距離に近づける
}
// beanCurve
// XY平面のbean型SDFをベースに、Z軸方向の厚みを球状断面として一体化。滑らかに厚みを持った豆型立体を形成
float beanCurveGIZAGIZA(vec3 p, vec3 center, float a) {
    vec3 q = p - center;
    float x = q.x, y = q.y, z = q.z;

    // 2D bean関数
    float f = pow(x, 4.0) + x*x*y*y + pow(y, 4.0) - a * x * (x*x + y*y);

    // 勾配（正規化用）
    vec2 grad = vec2(
        4.0 * pow(x, 3.0) + 2.0 * x * y * y - a * (3.0 * x * x + y * y),
        2.0 * x * x * y + 4.0 * pow(y, 3.0) - 2.0 * a * x * y
    );
    float df = max(length(grad), 0.0001);

    // beanカーブの2D距離
    float dXY = f / df;

    // fが負 → 内部 → -fで盛り上がり（境界f=0でちょうど0になる）
    float r = max(-f, 0.0);

    // Z方向の距離
    float dZ = abs(z) - r;

    // XYとZの合成SDF
    return max(dXY, dZ);
}

// 滑らかに max をとる関数
float smoothMax(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// 修正済み beanCurve
float beanCurveTigaumono(vec3 p, vec3 center, float a, float smoothness) {
    vec3 q = p - center;
    float x = q.x, y = q.y, z = q.z;

    // 2D曲線の式と勾配
    float f = pow(x, 4.0) + x*x*y*y + pow(y, 4.0) - a * x * (x*x + y*y);
    vec2 grad = vec2(
        4.0 * pow(x, 3.0) + 2.0 * x * y * y - a * (3.0 * x * x + y * y),
        2.0 * x * x * y + 4.0 * pow(y, 3.0) - 2.0 * a * x * y
    );
    float df = max(length(grad), 0.0001);
    float dXY = f / df;

    // fの値に応じてZ方向の盛り上がり高さをsoftplusで滑らかに定義
    float r = log(1.0 + exp(-f * smoothness)) / smoothness;

    // Z方向距離
    float dZ = abs(z) - r;

    // 丸めて合成
    return smoothMax(dXY, dZ, 0.1);
}

float curvatureSensitiveSmooth(float f, float curvatureScale) {
    // fの変化が激しいところではスムージング範囲を狭くする
    float eps = curvatureScale * abs(f); // fが小さいほどepsも小さくなる
    return smoothstep(0.0, eps, -f);
}

// いわゆるパラメトリック曲線をsdfで立体化する試み
// 完全にロジックを理解していないが完了！
float beanCurve(vec3 p, vec3 center, float phi, float a) {
    vec3 q = p - center;
    q.xy *= rotZ(-phi);
    float x = q.x, y = q.y, z = q.z;

    // bean関数 f と勾配ベクトルgrad
    float f = pow(x, 4.0) + x*x*y*y + pow(y, 4.0) - a * x * (x*x + y*y);
    vec2 grad = vec2(
        4.0 * pow(x, 3.0) + 2.0 * x * y * y - a * (3.0 * x * x + y * y),
        2.0 * x * x * y + 4.0 * pow(y, 3.0) - 2.0 * a * x * y
    );
    // length(grad)は|grad(f)|である。
    // 最小値の0を避けるため。最後にdfで割るので
    float df = max(length(grad), 0.0001);
    
    float bias = 0.001;   // 境界を少し内側に押し込むバイアス（ぎざぎざ防止）
    float edge = 0.0;    // 境界に平らな部分、「耳」をつける。数が大きくなると、耳も大きくなる
    
    // dx * 傾き = dz
    // ∴  dx = dz/傾き なので、おおよその0点までの距離になる
    float dXY = f / df;

    // Z方向の盛り上がりは f < 0 のときだけ -f
    float r = (f < 0.0) ? -f : 0.0;

    // z方向の現在位置 - 高さ
    float dZ = abs(z) - r;
    // 合成SDF
    // return max(max(dXY, dZ - bias), -z);
    return max(dXY, dZ-bias)-edge;
}

float flatDisc(vec3 p, vec3 center, float radius) {
    float dXY = length(p.xy - center.xy) - radius;
    float dZ  = abs(p.z - center.z);  // 厚みゼロ → Z一致だけ許す
    return max(dXY, dZ);
}
float crescent(vec3 p, vec3 center1, float r1, vec3 center2, float r2) {
    float dZ = abs(p.z - center1.z);
    float dOuter = length(p.xy - center1.xy) - r1;
    float dInner = length(p.xy - center2.xy) - r2;
    float d2D = max(-dInner, dOuter); // 三日月断面
    return max(dZ, d2D); // Zも一致して初めて接触
}

// 
// カメラ位置から、スクリーンの特定座標をつなぐレイの方向ベクトルを算出する関数
// 全てのスクリーン座標点に関してfragment shaderでスキャンされる
//
vec3 calcRayDir(vec2 uv, vec3 ro, vec3 target) {
    vec3 forward = normalize(target - ro);
    vec3 right   = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up      = cross(forward, right);
    return normalize(forward + uv.x * right + uv.y * up);
}






// この関数は、オブジェクトの関数を内部に持ち、
// ある位置pで各オブジェクトの内部なら+/0/-を返却するSDF関数群のうち
// 一番小さいものを返却する
//
float sceneSDF(vec3 p) {
  float d=100.0;
  float pos;
  float dif=1.4;
  float start=0.0;
  float div=12.0;
  
  if (uAxis) {
    d = min(d,axis(p));
  }
  for (int i=0; i<19; i++){
    pos = start + dif*float(i);
    d = min(d,beanCurve (p, vec3( pos, 0.3, 1.0), PI/div*float(i), 1.2));
  }
  /*                     
  d = min(d,spiralTube(p, vec3(-0.0, 0.4, 0.0),  0.3,  0.08, 0.03,   0.5));
  d = min(d,spiralTube(p, vec3(-0.1, 0.4, 0.0),  0.3,  0.08, 0.05,   1.001));
  d = min(d,spiralTube(p, vec3( 0.1, 0.4, 0.0),  0.3,  0.08, 0.011,  1.3));  
  d = min(d,spiralTube(p, vec3( 0.0, 0.4, -0.3), 0.3, -0.08, 0.020,  2.2));
  */
  //d = min(d,sdBoxWobble (p, vec3(0.0, 0.0, 0.0), vec2(0.4,0.2), 0.008, 4.0));
  //d = min(d, sdBoxWobble(p, vec3(0.0, 0.0, 0.0), vec2(0.2, 0.1), 0.015, 6.0, 0.05));
  /*
  d = min(d,crescent    (p, vec3(-0.1, 1.0, -0.3), 0.9, vec3(-0.2, 1.1, -0.3), 0.89));
  d = min(d,flatDisc    (p, vec3(0.0, 0.0,  -0.3), 0.25));
  */
  /*

  d = min(d,crescent    (p, vec3(0.6, -0.8, 1.0), 0.3, vec3(0.5, -0.8, 1.0), 0.3));    

  d = min(d,flatDisc    (p, vec3(0.0, 0.0,  -0.3), 0.25));
  d = min(d,flatDisc    (p, vec3(0.1, 0.1,  -0.32), 0.25));
  */
  return(d);
          
}

vec3 estimateNormal(vec3 p) {
    float eps = 0.0005;
    return normalize(vec3(
        sceneSDF(p + vec3(eps, 0, 0)) - sceneSDF(p - vec3(eps, 0, 0)),
        sceneSDF(p + vec3(0, eps, 0)) - sceneSDF(p - vec3(0, eps, 0)),
        sceneSDF(p + vec3(0, 0, eps)) - sceneSDF(p - vec3(0, 0, eps))
    ));
}
//
// roから、rdベクトルの方向に進む
// 何かのオブジェクトに衝突したらカメラ位置からの累積距離であるd0を返却する
// もし最大距離よりも進んでいたら(何もなかったら)-1.0を返却する
// d0が累積で進んだ距離
//
float rayMarch(vec3 ro, vec3 rd) {
  float dO = 0.0;
  int   maxSteps = uLowQuality ? LOW_QUALITY_STEPS    : HIGH_QUALITY_STEPS;    // 256
  float eps      = uLowQuality ? LOW_QUALITY_SURFDIST : HIGH_QUALITY_SURFDIST; // 0.001
  float maxDist  = uLowQuality ? LOW_QUALITY_MAXDIST  : HIGH_QUALITY_MAXDIST;  // 10.0
  for (int i = 0; i < maxSteps; i++) {
    vec3   p = ro + rd * dO;
    float dS = sceneSDF(p);
    if (dS < eps)     return   dO;
    if (dO > maxDist) return -1.0;
    dO += uLowQuality ? dS : clamp(dS * 0.2, MIN_STEP, MAX_STEP);
  }
}

#define LOW_QUALITY_DIST            0.01
#define HIGH_QUALITY_DIST           0.001
#define LOW_QUALITY_SHADOW_STEPS    8
#define HIGH_QUALITY_SHADOW_STEPS 256
#define LOW_QUALITY_COEF            0.8
#define HIGH_QUALITY_COEF           0.3
#define LOW_QUALITY_MINSTEP         0.01
#define HIGH_QUALITY_MINSTEP        0.005
#define LOW_QUALITY_MAXSTEP         0.1
#define HIGH_QUALITY_MAXSTEP        0.05

float softShadow(vec3 ro, vec3 rd) {
  float res = 1.0;// 最初は明るいと仮定
  // Rayの初期距離
  float t        = uLowQuality ? LOW_QUALITY_DIST  : HIGH_QUALITY_DIST;
  int   steps    = uLowQuality ? LOW_QUALITY_STEPS : HIGH_QUALITY_STEPS;
  float a        = uLowQuality ? LOW_QUALITY_COEF : HIGH_QUALITY_COEF;
  float step_min = uLowQuality ? LOW_QUALITY_MINSTEP : HIGH_QUALITY_MINSTEP;  
  float step_max = uLowQuality ? LOW_QUALITY_MAXSTEP : HIGH_QUALITY_MAXSTEP;
  for (int i = 0; i < steps; i++) {
    // 現在のRayが進んだ先で
    // 何かのオブジェクトにぶつかったら距離が0に近くなる
    // ぶつからなければ大きい値になる
    float h = sceneSDF(ro + rd * t);

    // 衝突とみなし、完全遮蔽（影）の0.0を返す
    if (h < 0.00001) return 0.0;

    // hが小さい値だとresが小さくなる、つまり影が濃くなる
    res = min(res, 8.0 * h / t);

    // h*0.5の値を、0.01～0.1の間に
    // 近くのオブジェクトに近づいたらステップを細かくする
    t += clamp(h * a, step_min, step_max);
  }
    // 0.0～1.0にクランプして値を返す
    return clamp(res, 0.0, 1.0);
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;

    vec3 ro = uCameraPos;
    vec3 tg = uTarget;
    ro+=(0.4, 10.2, 0.2);
    tg+=(1.0, 1.0, -2.2);

    // スキャンされるスクリーン座標点に対して
    // カメラからスクリーンの特定座標をつなぐ方向ベクトルを計算
    vec3 rd = calcRayDir(uv, ro, tg);

    // 各スクリーン座標点について方向ベクトルを用いて
    // 衝突判定をしてRayMarchingを実施
    float dist = rayMarch(ro, rd);
    if (dist < 0.0) {
        outColor = vec4(0.0);
        return;
    }

    vec3 p = ro + dist * rd;
    vec3 normal = estimateNormal(p);
    vec3 lightDir = normalize(vec3(-0.8, 0.6, 1.0));

    // Lambertの拡散反射（diffuse reflection）係数
    // clamp(x, min, max) は、値 x を minからmax の範囲内に収める関数なので、
    // 面の単位垂直ベクトルと光源方向の単位ベクトルの内積は理論的には-1～+1の範囲であるが
    // 浮動小数点誤差を考え、かつ、裏面にあたる光を無視するので、0.0～1.0の範囲に安全に抑え込む
    float diff   = clamp(dot(normal, lightDir), 0.0, 1.0);

    // pはカメラからのRayが衝突した点で、ピクセルが属する表面の3D座標
    // そこから、「ほんの少し」法線方向にずらすことで
    // 影判定のRayが自分自身にあたる(セルフシャドウ)を防ぐ。シャドウバイアス
    // もし光源が位置で与えられていたら lightDir=normalize(lightPos - p);
    // softShadow関数は、
    float shadow = softShadow(p + normal * 0.01, lightDir);
    // 白色 * 表面の明るさ
    vec3  color  = vec3(1.0) * diff * shadow;

    outColor = vec4(color, 1.0);
}

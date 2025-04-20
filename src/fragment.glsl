precision highp float;

uniform vec2  uResolution;
uniform float uTime;
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

#define HIGH_QUALITY_STEPS 256
#define LOW_QUALITY_STEPS 20
#define HIGH_QUALITY_MAXDIST 10.0
#define LOW_QUALITY_MAXDIST   8.0
#define HIGH_QUALITY_SURFDIST 0.001
#define LOW_QUALITY_SURFDIST  0.1
#define MIN_STEP 0.001
#define MAX_STEP 0.2


// z軸回転の2x2行列
//  c -s
//  s  c
mat2 rotZ(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

// x軸廻りの回転
//
//
mat3 rotX(float a) {
  float c = cos(a), s = sin(a);
  return mat3(
    1.0, 0.0, 0.0,
    0.0,    c, -s,
    0.0,    s,  c
  );
}

mat3 rotY(float a) {
  float c = cos(a), s = sin(a);
  return mat3(
     c, 0.0, s,
    0.0, 1.0, 0.0,
    -s, 0.0, c
  );
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
    q.xy *=rotZ(-phi);
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

float beanCurve(vec3 p, vec3 center, float a, float thickness) {
    vec3 q = p - center;
    float x = q.x, y = q.y, z = q.z;

    float f = pow(x, 4.0) + x * x * y * y + pow(y, 4.0) - a * x * (x * x + y * y);
    vec2 grad = vec2(
        4.0 * pow(x, 3.0) + 2.0 * x * y * y - a * (3.0 * x * x + y * y),
        2.0 * x * x * y + 4.0 * pow(y, 3.0) - 2.0 * a * x * y
    );
    float df = max(length(grad), 0.0001);

    float dXY = f / df;

    // 厚みを Z と一体化して球状の断面にする
    float r = thickness * 0.5;
    float dz = length(vec2(dXY, z)) - r;

    return max(dXY,dz);
}


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
// 視線方向ベクトルをカメラ位置と注視点から構築する
//
vec3 calcRayDir(vec2 uv, vec3 ro, vec3 target) {
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = cross(forward, right);
    return normalize(forward + uv.x * right + uv.y * up);
}




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


float sceneSDF(vec3 p) {
  float d=100.0;
  //                          center,         radius  phi_x
  d = min(d,hemiSphere(p,vec3(1.0, 0.0, 0.0), 0.8,    -0.4));
  //d = min(d,beanCurveZ(p, vec3(0.0, 0.0, 1.0), 0.8));
  //d = min(d,beanCurve (p, vec3(0.3, 0.3, -3.0), 4.9,  0.03));  
   d = min(d,spiralTube(p, vec3(-0.0, 0.4, 0.0),  0.3,  0.08, 0.03,   0.5));
   d = min(d,spiralTube(p, vec3(-0.1, 0.4, 0.0),  0.3,  0.08, 0.05,   1.001));
   d = min(d,spiralTube(p, vec3( 0.1, 0.4, 0.0),  0.3,  0.08, 0.011,  1.3));  
   d = min(d,spiralTube(p, vec3( 0.0, 0.4, -0.3), 0.3, -0.08, 0.020,  2.2));
   //d = min(d,sdBoxWobble (p, vec3(0.0, 0.0, 0.0), vec2(0.4,0.2), 0.008, 4.0));
  //d = min(d, sdBoxWobble(p, vec3(0.0, 0.0, 0.0), vec2(0.2, 0.1), 0.015, 6.0, 0.05));
  d = min(d,crescent    (p, vec3(-0.1, 1.0, -0.3), 0.9, vec3(-0.2, 1.1, -0.3), 0.89));
   d = min(d,flatDisc    (p, vec3(0.0, 0.0,  -0.3), 0.25));
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

float rayMarch(vec3 ro, vec3 rd) {
    float dO = 0.0;
    int   maxSteps = uLowQuality ? LOW_QUALITY_STEPS    : HIGH_QUALITY_STEPS;
    float eps      = uLowQuality ? LOW_QUALITY_SURFDIST : HIGH_QUALITY_SURFDIST;
    float maxDist  = uLowQuality ? LOW_QUALITY_MAXDIST  : HIGH_QUALITY_MAXDIST;
    
    for (int i = 0; i < maxSteps; i++) {
        vec3   p = ro + rd * dO;
        float dS = sceneSDF(p);
        
        if (dS < eps) return dO;
       if (dO > maxDist) break;
        dO += uLowQuality ? dS : clamp(dS * 0.2, MIN_STEP, MAX_STEP);
    }
    return -1.0;
}

float softShadow(vec3 ro, vec3 rd) {
  float res = 1.0; // 光がさえぎられている割合

  float t = 0.01;
    for (int i = 0; i < 64; i++) {
        float h = sceneSDF(ro + rd * t);
        if (h < 0.00001) return 0.0;
        res = min(res, 8.0 * h / t); 
        t += clamp(h * 0.5, 0.01, 0.1);
    }
    return clamp(res, 0.0, 1.0);
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / uResolution.y;

    vec3 ro = uCameraPos;
    vec3 rd = calcRayDir(uv, ro, uTarget);

    float dist = rayMarch(ro, rd);
    if (dist < 0.0) {
        outColor = vec4(0.0);
        return;
    }

    vec3 p = ro + dist * rd;
    vec3 normal = estimateNormal(p);
    vec3 lightDir = normalize(vec3(-0.8, 0.6, 1.0));

    float diff   = clamp(dot(normal, lightDir), 0.0, 1.0);
    float shadow = softShadow(p + normal * 0.01, lightDir);
    vec3  color  = vec3(1.0) * diff * shadow;

    outColor = vec4(color, 1.0);
}

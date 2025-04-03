precision highp float;
uniform float time;
uniform vec2 resolution;
uniform int noiseType;
uniform int octaves;
uniform float amplitude;
uniform float frequency;
uniform float attractorPositions[12];  // 3つのアトラクタを格納 (x, y, z) * 3 = 9
uniform float attractorStrengths[4];  // それぞれの強度
uniform int numAttractors;
uniform int patternType;

// ==== 定数定義 =====
const int POTENTIAL_DEFAULT = 0;
const int POTENTIAL_WARP = 1;
const int POTENTIAL_FORCE = 2;
const int POTENTIAL_DISTANCE = 3;

// ==== 構造体定義 =====
struct Pattern {
  int attractors;
  int type;
  float beatTime;
  float centerRadius;
};

struct PotentialResult {
    float value;
    float minDist;
};

struct ContourResult {
    float line;
};

// ==== パターン定義 =====
Pattern getPattern(int id) {
  float currentBeatTime = time / 60.0;
  switch (id) {
  case 0:
    return Pattern(1, POTENTIAL_DEFAULT, -150.0*currentBeatTime,0.007);
  case 1:
    return Pattern(3, POTENTIAL_WARP, 120.0*currentBeatTime,0.007);
  case 2:
    return Pattern(2, POTENTIAL_FORCE, -120.0*currentBeatTime,0.01);
  case 3:
    return Pattern(4, POTENTIAL_DEFAULT, 360.0*currentBeatTime,0.01);
  default:
          return Pattern(1, POTENTIAL_DISTANCE, 60.0*currentBeatTime,0.007);
    }
}


// ===== ユーティリティ関数 =====

// HSVからRGBへの変換関数
vec3 hsv2rgb(float h, float s, float v) {
    float c = v * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = v - c;
    
    vec3 color;
    if (h < 1.0/6.0) color = vec3(c, x, 0.0);
    else if (h < 2.0/6.0) color = vec3(x, c, 0.0);
    else if (h < 3.0/6.0) color = vec3(0.0, c, x);
    else if (h < 4.0/6.0) color = vec3(0.0, x, c);
    else if (h < 5.0/6.0) color = vec3(x, 0.0, c);
    else color = vec3(c, 0.0, x);
    
    return color + m;
}

// 3次元ハッシュ関数（Perlinノイズ用の勾配ベクトル生成）
vec3 hash33(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yxz + 19.19);
    return fract((p.xxy + p.yxx) * p.zyx);
}

// Perlinノイズ関数
float perlinNoise(vec3 p) {
    // グリッドのセル座標とセル内での位置を計算
    vec3 i = floor(p);
    vec3 f = fract(p);
    
    // 8つの隣接する頂点の勾配ベクトル
    vec3 g000 = hash33(i);
    vec3 g100 = hash33(i + vec3(1.0, 0.0, 0.0));
    vec3 g010 = hash33(i + vec3(0.0, 1.0, 0.0));
    vec3 g110 = hash33(i + vec3(1.0, 1.0, 0.0));
    vec3 g001 = hash33(i + vec3(0.0, 0.0, 1.0));
    vec3 g101 = hash33(i + vec3(1.0, 0.0, 1.0));
    vec3 g011 = hash33(i + vec3(0.0, 1.0, 1.0));
    vec3 g111 = hash33(i + vec3(1.0, 1.0, 1.0));
    
    // スムーズな補間のための重み（Perlinの改善版の重み付け関数）
    vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    
    // 8つの勾配ベクトルと位置ベクトルの内積を計算
    float n000 = dot(g000, f);
    float n100 = dot(g100, f - vec3(1.0, 0.0, 0.0));
    float n010 = dot(g010, f - vec3(0.0, 1.0, 0.0));
    float n110 = dot(g110, f - vec3(1.0, 1.0, 0.0));
    float n001 = dot(g001, f - vec3(0.0, 0.0, 1.0));
    float n101 = dot(g101, f - vec3(1.0, 0.0, 1.0));
    float n011 = dot(g011, f - vec3(0.0, 1.0, 1.0));
    float n111 = dot(g111, f - vec3(1.0, 1.0, 1.0));
    
    // 8つの値を補間
    return mix(mix(mix(n000, n100, u.x),
                  mix(n010, n110, u.x), u.y),
              mix(mix(n001, n101, u.x),
                  mix(n011, n111, u.x), u.y), u.z);
}

// フラクタルPerlinノイズ（複数オクターブを重ね合わせたもの）
float fractalPerlinNoise(vec3 p, int octaves, float persistence) {
    float total = 0.0;
    float frequency = 1.0;
    float amplitude = 1.0;
    float maxValue = 0.0;  // 正規化のための値
    
    for(int i = 0; i < octaves; i++) {
        total += perlinNoise(p * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2.0;
    }
    
    // 0-1の範囲に正規化
    return total / maxValue;
}

// ===== ポテンシャル計算関連 ====================================================

float potential(vec3 pos) {
    float total = 0.0;
    for (int i = 0; i < numAttractors; i++) {
        vec3 attractorPos = vec3(
            attractorPositions[i * 3],
            attractorPositions[i * 3 + 1],
            attractorPositions[i * 3 + 2]
        );
        
        vec3  diff         = pos - attractorPos;       // 方向ベクトル
        vec2  dir          = normalize(diff.xy);           // 方向ベクトルを正規化
        float angle        = atan(dir.y, dir.x);     // diff の角度を取得
        float distortion   = cos(angle);  // 2.0 は歪みの強さを調整する定数
        float dist         = length(diff);         //オリジナル正円ポテンシャル
        total             += attractorStrengths[i]*dist;
    }
    return total;
}

// 連続的な角度計算関数
float continuousAngle(vec2 dir) {
    float angle = atan(dir.y/dir.x);
    
    // x座標が負の場合、角度を調整
    if (dir.x < 0.0) {
        angle += 3.14159; // πを加算
    }
    
    // y座標が負の場合、角度を調整
    if (dir.y < 0.0 && dir.x >= 0.0) {
        angle += 6.28318; // 2πを加算
    }
    
    return angle;
}

//
// POTENTIAL_DEFAULT
//

float calculateDefaultPotential(vec2 uv, vec3 attractorPos, float strength, float beatTime) {
    vec2 dir = attractorPos.xy - uv;
    vec2 ndir = normalize(dir);
    float angle = continuousAngle(ndir);
    float dist = length(dir);
    
    // 歪みパラメータを関数内で定義
    const float A = 1.0;      // 基礎振幅
    const float B = 2.9;      // 揺らぎの強さ
    const int n = 2;          // 高調波の数
    const float baseFreq = 7.0; // 基本周波数
    
    // Perlinノイズで位相を生成（一度だけ計算）
    float phaseNoise = perlinNoise(vec3(uv * 5.0, beatTime*0.125));
    
    // 基本の歪み
    float warp;
    

    
    // 歪みパラメータを関数内で定義
    const float warpStrength = 0.3;     // 歪みの強さ
    const float warpFrequency = 10.0; // 歪みの周波数
    
    // 歪み計算
    warp = abs(cos(angle * warpFrequency) + 2.0) * warpStrength;

    // 高調波を加算
    for (int k = 2; k <= n; k++) {
        // 各高調波の位相をPerlinノイズから生成
        float phase = phaseNoise * float(k) * 6.28318; // 0-2πの範囲に変換
        warp += B * (1.0 / float(k)) * sin(float(k) * baseFreq * angle + phase);
    }


    return strength / (dist + 0.001) + warp;
}

// 等方的歪み付きポテンシャル計算
float calculateWarpPotential(vec2 uv, vec3 attractorPos, float strength, float beatTime) {
    vec2 dir = attractorPos.xy - uv;
    vec2 ndir = normalize(dir);
    float angle = continuousAngle(ndir);
    float dist = length(dir);
    
    // 歪みパラメータを関数内で定義
    const float warpStrength = 0.3;     // 歪みの強さ
    const float warpFrequency = 10.0; // 歪みの周波数
    
    // 歪み計算
    float warp = abs(cos(angle * warpFrequency) + 2.0) * warpStrength;
    
    return strength / (dist + 0.001) + warp;
}

// 力場ベースのポテンシャル計算
float calculateForcePotential(vec2 uv, vec3 attractorPos, float strength, float beatTime) {
    vec2 dir = attractorPos.xy - uv;
    float dist = length(dir);
    dir = normalize(dir);
    return strength / (dist * dist + 0.001);
}

// 単純な距離ベースのポテンシャル計算
float calculateDistancePotential(vec2 uv, vec3 attractorPos, float strength, float beatTime) {
    vec2 dir = attractorPos.xy - uv;
    float dist = length(dir);
    return strength * dist;
}

// ポテンシャル場の計算を行う関数
PotentialResult calculatePotential(vec2 uv, Pattern pattern) {
    float minDist = 100.0;
    float potentialValue = 0.0;
    float beatTime= pattern.beatTime;
    
    // 実際に使用するアトラクタの個数を取得
    int actualNumAttractors = pattern.attractors;
    
    for (int i = 0; i < actualNumAttractors; i++) {
        vec3 attractorPos = vec3(
            attractorPositions[i * 3],
            attractorPositions[i * 3 + 1],
            attractorPositions[i * 3 + 2]
        );
        
        float dist = length(attractorPos.xy - uv);
        minDist = min(minDist, dist);
        
        // ポテンシャル計算の種類に応じて関数を切り替え
        float contribution;
        switch (pattern.type) {
            case POTENTIAL_DEFAULT:
                contribution = calculateDefaultPotential(uv, attractorPos, attractorStrengths[i], beatTime);
                break;
            case POTENTIAL_WARP:
                contribution = calculateWarpPotential(uv, attractorPos, attractorStrengths[i], beatTime);
                break;
            case POTENTIAL_FORCE:
                contribution = calculateForcePotential(uv, attractorPos, attractorStrengths[i], beatTime);
                break;
            default:  // POTENTIAL_DISTANCE
                contribution = calculateDistancePotential(uv, attractorPos, attractorStrengths[i], beatTime);
                break;
        }
        
        potentialValue += contribution;
    }
    
    return PotentialResult(potentialValue, minDist);
}

// 等高線を生成する関数
ContourResult generateContour(PotentialResult potential, Pattern pattern) {
    float lineWidth;
    float contourPattern;
    float minDist=potential.minDist;
    float beatTime=pattern.beatTime;
    
    switch (pattern.type) {
        case POTENTIAL_DEFAULT:
            // デフォルトポテンシャル用の等高線
            float defaultFrequency = 0.001 + 0.02 * (1.0 - exp(-115.0 * minDist));
            lineWidth = mix(0.5, 0.6, smoothstep(0.0, 1.0, potential.minDist));
            contourPattern = fract(potential.value * defaultFrequency * 1.7 + fract(beatTime));
            float defaultContourLine = smoothstep(0.0, lineWidth, contourPattern) * 
                                     smoothstep(lineWidth * 1.1, lineWidth, contourPattern);
            defaultContourLine = pow(defaultContourLine, 10.1);
            return ContourResult(defaultContourLine);
            
        case POTENTIAL_WARP:
            // 歪み付きポテンシャル用の等高線（元の形を保つ）
            float nearFunction = 3.9 + 0.8 * (1.0 - exp(-5.0 * potential.minDist));
            float farFunction = 0.05 / (1.0 + 0.1 / max(potential.minDist, 0.001));
            float warpFrequency = nearFunction * farFunction;
            lineWidth = 0.9;  // 元の実装では固定値を使用
            contourPattern = fract(potential.value * warpFrequency * 5.7 + fract(beatTime));
            float warpContourLine = smoothstep(0.0, lineWidth, contourPattern) * 
                                  smoothstep(lineWidth * 2.0, lineWidth, contourPattern);
            warpContourLine = pow(warpContourLine, 0.5);
            return ContourResult(warpContourLine);
            
        case POTENTIAL_FORCE:
          // 周波数：minDistが大きくなると適度に増える
          float forceFrequency = minDist * 0.3 / (0.5 - minDist);

          // 線幅：近距離では太く、遠距離で細く（視認性重視）
          float lineWidth = 10.0*minDist;

          // パターン生成
          float contourPattern = fract(potential.value * forceFrequency*0.8 - fract(beatTime));

          // 等高線の二重 smoothstep による幅制御
          float forceContourLine = smoothstep(2.0, lineWidth*0.1, contourPattern) *
            smoothstep(lineWidth * 0.002, lineWidth*4.0, contourPattern);

          // カーブ補正（出力強調）
          forceContourLine = pow(forceContourLine, 0.5);

          // 出力
          return ContourResult(forceContourLine);

            
        default:  // POTENTIAL_DISTANCE
            // 距離ベースのポテンシャル用の等高線
            float distanceFrequency = 3.0 + 1.0 * (1.0 - exp(-4.0 * potential.minDist));
            lineWidth = mix(0.5, 1.2, smoothstep(0.0, 0.7, potential.minDist));
            contourPattern = fract(potential.value * distanceFrequency * 5.7 + fract(pattern.beatTime * 2.0/3.0));
            float distanceContourLine = smoothstep(0.0, lineWidth, contourPattern) * 
                                      smoothstep(lineWidth * 2.0, lineWidth, contourPattern);
            distanceContourLine = pow(distanceContourLine, 0.9);
            return ContourResult(distanceContourLine);
    }
}

// 背景のカラーマップを生成する関数
vec3 generateBackgroundColor(float potentialValue) {
    float normalizedPotential = clamp((potentialValue + 5.0) * 0.1, 0.0, 1.0);  
    float hue = (1.0 - normalizedPotential) * 0.7;
    float saturation = 0.8;
    float value = 0.9;
    return hsv2rgb(hue, saturation, value);
}


/* color map + line */
void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
   
    // ==== 初期設定 =====
    Pattern pattern = getPattern(patternType);

    
    // ==== 描画計算本体 ====
    // ポテンシャルの値の計算
    PotentialResult potential = calculatePotential(uv, pattern);
    
    // 背景のカラーマップ作成
    vec3 backgroundColor = generateBackgroundColor(potential.value);
    
    // 等高線の作成
    ContourResult contour = generateContour(potential, pattern);
    
    // 線の色（白色）
    vec3 lineColor = vec3(1.0);
    
    // 背景色と線の色を合成、もしくはアトラクタの中心を塗りつぶし
    vec3 finalColor = mix(backgroundColor, lineColor, contour.line);
    if (potential.minDist < pattern.centerRadius) {
        finalColor = backgroundColor;
    }
    gl_FragColor = vec4(finalColor, 1.0);
}



precision highp float;

uniform float time;
uniform vec2 resolution;
uniform int noiseType;
uniform int octaves;
uniform float amplitude;
uniform float frequency;
uniform float attractorPositions[9];  // 3つのアトラクタを格納 (x, y, z) * 3 = 9
uniform float attractorStrengths[3];  // それぞれの強度
uniform int numAttractors;



// 3次元ハッシュ関数
vec3 hash33(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yxz + 19.19);
    return fract((p.xxy + p.yxx) * p.zyx);
}

// 値ノイズ関数
float valueNoise(vec3 p) {
    // グリッドのセル座標とセル内での位置を計算
    vec3 i = floor(p);
    vec3 f = fract(p);
    
    // 8つの隣接する頂点のハッシュ値
    float a = hash33(i).x;
    float b = hash33(i + vec3(1.0, 0.0, 0.0)).x;
    float c = hash33(i + vec3(0.0, 1.0, 0.0)).x;
    float d = hash33(i + vec3(1.0, 1.0, 0.0)).x;
    float e = hash33(i + vec3(0.0, 0.0, 1.0)).x;
    float f1 = hash33(i + vec3(1.0, 0.0, 1.0)).x;
    float g = hash33(i + vec3(0.0, 1.0, 1.0)).x;
    float h = hash33(i + vec3(1.0, 1.0, 1.0)).x;
    
    // スムーズな補間のための重み
    vec3 u = f * f * (3.0 - 2.0 * f);
    
    // 8つの値を補間
    return mix(mix(mix(a, b, u.x),
                  mix(c, d, u.x), u.y),
              mix(mix(e, f1, u.x),
                  mix(g, h, u.x), u.y), u.z);
}

// フラクタルノイズ（複数オクターブを重ね合わせたもの）
float fractalValueNoise(vec3 p, int octaves, float persistence) {
    float total = 0.0;
    float frequency = 1.0;
    float amplitude = 1.0;
    float maxValue = 0.0;  // 正規化のための値
    
    for(int i = 0; i < octaves; i++) {
        total += valueNoise(p * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= 2.0;
    }
    
    // 0?1の範囲に正規化
    return total / maxValue;
}


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
/* color map + line */
void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    float minDist = 1.0;
    float dist;
    // ポテンシャル場の計算
    float potentialValue = 0.0;
    for (int i = 0; i < numAttractors; i++) {
        vec3 attractorPos = vec3(
            attractorPositions[i * 3],
            attractorPositions[i * 3 + 1],
            attractorPositions[i * 3 + 2]
        );
        
        vec2    dir     = attractorPos.xy - uv;
        vec2   ndir     = normalize(dir);
        float angle     = atan(ndir.y/ndir.x);
        dist     = length(dir);
        minDist         = min(minDist,dist);
        float warp      = abs(cos(angle*10.0)+2.0)*0.3;
        potentialValue += attractorStrengths[i] / (dist + 0.001) + warp;

    }
    
    // ポテンシャル値を使いやすい範囲に調整（必要に応じて調整）
    float normalizedPotential = clamp((potentialValue + 5.0) * 0.1, 0.0, 1.0);
    
    // ===== 背景のカラーマップ作成 =====
    // HSVでグラデーションを定義（青から赤へのグラデーション）
    float hue = (1.0 - normalizedPotential) * 0.7; // 青(0.7)から赤(0.0)
    float saturation = 0.8;
    float value = 0.9;
    
    // HSV to RGB変換
    vec3 backgroundColor;
    float c = value * saturation;
    float x = c * (1.0 - abs(mod(hue * 6.0, 2.0) - 1.0));
    float m = value - c;
    
    if (hue < 1.0/6.0) backgroundColor = vec3(c, x, 0.0);
    else if (hue < 2.0/6.0) backgroundColor = vec3(x, c, 0.0);
    else if (hue < 3.0/6.0) backgroundColor = vec3(0.0, c, x);
    else if (hue < 4.0/6.0) backgroundColor = vec3(0.0, x, c);
    else if (hue < 5.0/6.0) backgroundColor = vec3(x, 0.0, c);
    else backgroundColor = vec3(c, 0.0, x);
    
    backgroundColor = backgroundColor + m;
    
    // ===== 等高線の作成 =====
    // 等高線の間隔を調整（値が大きいほど線が密になる）
    float contourFrequency = 5.7;
    // 線の幅を調整（値が小さいほど線が細くなる）
    float contourWidth = 0.8;


    // 近距離用の関数（小さい値では頻度が低い）
    float nearFunction = 3.9 + 0.8 * (1.0 - exp(-5.0 * minDist));

    // 遠距離用の関数（大きい値でも頻度が適切）
    float farFunction = 0.05 / (1.0 + 0.1 / max(minDist, 0.001));

    // 二つの関数を組み合わせる（乗算で特性を合成）
    float frequencyFactor = nearFunction * farFunction;

    // 最終的な周波数調整
    float localFrequency = contourFrequency * frequencyFactor;

    
    //float contourPattern = fract(potentialValue * localFrequency+fract(time*2.0/3.0));
    //float contourPattern = fract(potentialValue * contourFrequency - time);
    float   contourPattern = fract(potentialValue * localFrequency -(+time));
    
    float contourLine = smoothstep(0.0, contourWidth, contourPattern) * smoothstep(contourWidth * 2.0, contourWidth, contourPattern);
      
    
    // 線の鮮明さを強調
    contourLine = pow(contourLine, 0.5);
    
    // 線の色（白色）
    vec3 lineColor = vec3(1.0);
    
    // 背景色と線の色を合成
    vec3 finalColor = mix(backgroundColor, lineColor, contourLine);
    if (minDist<0.003) {
      finalColor=backgroundColor;
    }
    gl_FragColor = vec4(finalColor, 1.0);
}




/*
  color map version
  
void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    // ポテンシャル場またはベクトル場の計算
    vec2 force = vec2(0.0);
    for (int i = 0; i < numAttractors; i++) {
        vec3 attractorPos = vec3(
            attractorPositions[i * 3],
            attractorPositions[i * 3 + 1],
            attractorPositions[i * 3 + 2]
        );
        
        vec2 dir = attractorPos.xy - uv;
        float dist = length(dir);
        dir = normalize(dir);
        
        float strength = attractorStrengths[i] / (dist * dist + 0.01);
        force += dir * strength;
    }
    
    // 力の大きさを計算
    float forceMagnitude = length(force);
    forceMagnitude = clamp(forceMagnitude * 0.5, 0.0, 1.0);
    
    // 力の方向を色相にマッピング
    float angle = atan(force.y, force.x) / (2.0 * 3.14159) + 0.5;
    
    // HSVからRGBへの変換（簡易版）
    vec3 color;
    float h = angle;
    float s = 0.8;
    float v = forceMagnitude;
    
    // HSV to RGB変換
    float c = v * s;
    float x = c * (1.0 - abs(mod(h * 6.0, 2.0) - 1.0));
    float m = v - c;
    
    if (h < 1.0/6.0) color = vec3(c, x, 0.0);
    else if (h < 2.0/6.0) color = vec3(x, c, 0.0);
    else if (h < 3.0/6.0) color = vec3(0.0, c, x);
    else if (h < 4.0/6.0) color = vec3(0.0, x, c);
    else if (h < 5.0/6.0) color = vec3(x, 0.0, c);
    else color = vec3(c, 0.0, x);
    
    color = color + m;
    
    gl_FragColor = vec4(color, 1.0);
}
*/
/*
  noise version
void main() {
    vec2 uv  = gl_FragCoord.xy / resolution.xy;
    vec3 pos = vec3(uv * 5.0, time * 0.1);

    // 吸引力の合計を初期化
    vec2 force = vec2(0.0);

    // 各アトラクタからの引力を計算
    for (int i = 0; i < numAttractors; i++) {
        vec3 attractorPos = vec3(
            attractorPositions[i * 3],
            attractorPositions[i * 3 + 1],
            attractorPositions[i * 3 + 2]
        );

        vec2 dir = attractorPos.xy - uv;  // アトラクタへの方向ベクトル
        float dist = length(dir);
        dir = normalize(dir);

        // 距離に応じた引力を計算 (距離が近いほど強くなる)
        float strength = attractorStrengths[i] / (dist * dist + 0.01);  // 0.01 はゼロ割防止
        force += dir * strength;
    }

    // pos に力を適用 (力の影響を加味してノイズ生成)
    pos.xy += clamp(force*0.05, vec2(-1.0), vec2(1.0));

    float n = fractalValueNoise(pos,octaves,amplitude);

    float normalizedNoise = (n + 1.0) * 0.5;
    vec3 color;
    if (normalizedNoise < 0.25) {
      color = mix(vec3(0.0, 0.0, 0.3), vec3(0.0, 0.3, 0.6), normalizedNoise * 4.0);
    } else if (normalizedNoise < 0.5) {
      color = mix(vec3(0.0, 0.3, 0.6), vec3(0.3, 0.6, 0.9), (normalizedNoise - 0.25) * 4.0);
    } else if (normalizedNoise < 0.75) {
      color = mix(vec3(0.3, 0.6, 0.9), vec3(0.9, 0.9, 0.6), (normalizedNoise - 0.5) * 4.0);
    } else {
      color = mix(vec3(0.9, 0.9, 0.6), vec3(1.0, 0.6, 0.1), (normalizedNoise - 0.75) * 4.0);
    }
    gl_FragColor = vec4(color, 1.0);
*/

/* 等高線
   
void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    
    // ポテンシャル場の計算
    float potentialValue = 0.0;
    for (int i = 0; i < numAttractors; i++) {
        vec3 attractorPos = vec3(
            attractorPositions[i * 3],
            attractorPositions[i * 3 + 1],
            attractorPositions[i * 3 + 2]
        );
        
        vec2 dir = attractorPos.xy - uv;
        float dist = length(dir);
        potentialValue += attractorStrengths[i] / (dist + 0.01);
    }
    
    // 等高線パターンの作成（滑らかな等高線）
    float lines = sin(potentialValue * 10.0) * 0.5 + 0.5;
    //lines = smoothstep(0.45, 0.55, lines); // よりシャープな線
    
    // 背景色と線の色のブレンド
    vec3 backgroundColor = vec3(0.0, 0.0, 0.2);
    vec3 lineColor = vec3(0.7, 0.8, 1.0);
    vec3 color = mix(backgroundColor, lineColor, lines);
    
    gl_FragColor = vec4(color, 1.0);
}

*/

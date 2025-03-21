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

// パーマネンステーブル
// error 版
//vec3 permute(vec3 x) {
//    return mod((34.0 * x + 1.0) * x, 289.0);
//}

vec4 permute(vec4 x) {
    return mod((x * 34.0 + 1.0) * x, 289.0);
}



// パーミュテーション関数
float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - 0.5;

    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
        i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
        i.x + vec4(0.0, i1.x, i2.x, 1.0)
    );

    
    //vec4 norm = 1.79284291400159 - 0.85373472095314 * dot(p, p);
    //p *= norm;

    float norm = 1.79284291400159 - 0.85373472095314 * dot(p, p);
    p *= norm;



    vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m *= m;
    //return 42.0 * dot(m * m, vec4(dot(p, x0), dot(p, x1), dot(p, x2), dot(p, x3)));
    //vec4 pVec = vec4(dot(p, x0), dot(p, x1), dot(p, x2), dot(p, x3));
    //return 42.0 * dot(m * m, pVec);

    vec4 pVec = vec4(
                     dot(p.xyz, x0), 
                     dot(p.xyz, x1), 
                     dot(p.xyz, x2), 
                     dot(p.xyz, x3)
                     );



    return 42.0 * dot(m * m, pVec);
}

float perlinNoise(vec3 p) {
    return snoise(p);
}

float fractalNoise(vec3 pos) {
    float total = 0.0;
    float amplitudeAccum = 1.0;
    float frequencyAccum = 1.0;

    for (int i = 0; i < 10; i++) {
        if (i >= octaves) break;
        float noiseVal = (noiseType == 0) ? perlinNoise(pos * frequencyAccum) : snoise(pos * frequencyAccum);
        total += noiseVal * amplitudeAccum;
        amplitudeAccum *= amplitude;
        frequencyAccum *= frequency;
    }
    return total;
}

float potential(vec3 pos) {
    float total = 0.0;
    for (int i = 0; i < numAttractors; i++) {
        vec3 attractorPos = vec3(
            attractorPositions[i * 3],
            attractorPositions[i * 3 + 1],
            attractorPositions[i * 3 + 2]
        );
        
        vec3 diff = pos - attractorPos;
        float dist = length(diff);
        total += attractorStrengths[i] / (dist + 0.1);
    }
    return total;
}
void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
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
    pos.xy += force * 0.05;  // 0.05 は力の強さを調整する定数
    float n = fractalNoise(pos);

    // 結果を表示
    gl_FragColor = vec4(vec3(n), 1.0);
}


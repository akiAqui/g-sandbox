// shaders/common/header.glsl

uniform sampler2D uTexture;    // 入力テクスチャ
uniform float uTime;           // 時間
uniform vec2 uResolution;      // 画面解像度

// varying vec2 vUv;             // UV座標

// 2次元ベクトルの長さの二乗を計算
float length2(vec2 p) {
    return p.x * p.x + p.y * p.y;
}

// UV座標を中心点に対して変換
vec2 transformUV(vec2 uv, vec2 center) {
    return uv - center;
}

// デカルト座標から極座標への変換
void cartesianToPolar(vec2 uv, out float r, out float theta) {
    r = sqrt(uv.x * uv.x + uv.y * uv.y);
    theta = atan(uv.y, uv.x);
}

// 極座標からデカルト座標への変換
vec2 polarToCartesian(float r, float theta) {
    return vec2(r * cos(theta), r * sin(theta));
}

// 値を範囲内に制限するヘルパー関数
float clamp01(float value) {
    return clamp(value, 0.0, 1.0);
}

// 線形補間
float lerp(float a, float b, float t) {
    return a + (b - a) * t;
}

// スムーズステップ関数
float smoothstep01(float t) {
    t = clamp01(t);
    return t * t * (3.0 - 2.0 * t);
}


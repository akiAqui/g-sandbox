// shaders/effects/spiral_zoom.glsl

#include header.glsl


// 対数関数を使用した回転の制御
// 時間に基づくアニメーション
// スケーリング効果
// 範囲外のUV座標のハンドリング


// エフェクト固有のuniform変数
uniform float uK;         // 回転の強さ
uniform float uAlpha;     // スケール係数
uniform float uOmega;     // アニメーション速度
uniform float uEpsilon;   // 小さな定数（0除算防止）
varying vec2 vUv;

void main() {
    // UV座標を中心を原点として変換
    vec2 uv = transformUV(vUv, vec2(0.5));
    
    // デカルト座標から極座標へ変換
    float r, theta;
    cartesianToPolar(uv, r, theta);
    
    // スパイラルズーム変換の適用
    // 1. 対数関数による回転の適用
    float logComponent = log(r + uEpsilon);
    // 2. 時間による回転の適用
    float timeComponent = uOmega * uTime;
    // 3. 回転角の計算
    float thetaPrime = theta + uK * (logComponent + timeComponent);
    
    // 4. 半径方向のスケーリング
    float rPrime = uAlpha * r;
    
    // 極座標からデカルト座標へ戻す
    vec2 uvPrime = polarToCartesian(rPrime, thetaPrime);
    
    // 中心点を元に戻す
    uvPrime += vec2(0.5);
    
    // テクスチャのサンプリング
    // UV座標が範囲外の場合は黒を返す
    if (uvPrime.x < 0.0 || uvPrime.x > 1.0 || 
        uvPrime.y < 0.0 || uvPrime.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        gl_FragColor = texture2D(uTexture, uvPrime);
    }
}

// shaders/effects/pinch_punch.glsl

#include header.glsl


// パラメータuAlphaの値によって効果が変化
//   uAlpha > 1.0: ピンチ効果（中心に向かって引き込む）
//   uAlpha < 1.0: パンチ効果（中心から押し出す）
//
// スムーズな変形のための工夫
//   エッジでのフェードアウト
//   中心からの距離に応じたトランジション効果
//
// 元の画像とのブレンド
//   急激な変形を避けるため、元の画像との補間を実施



// エフェクト固有のuniform変数
uniform float uAlpha;     // ピンチ/パンチの強度（1.0より大きいとピンチ、小さいとパンチ）

void main() {
    // UV座標を中心を原点として変換
    vec2 uv = transformUV(vUv, vec2(0.5));
    
    // デカルト座標から極座標へ変換
    float r, theta;
    cartesianToPolar(uv, r, theta);
    
    // Pinch/Punch変換の適用
    // 1. 半径の非線形変換
    float rPrime = pow(r, uAlpha);
    
    // 2. 角度は変更なし
    float thetaPrime = theta;
    
    // 極座標からデカルト座標へ戻す
    vec2 uvPrime = polarToCartesian(rPrime, thetaPrime);
    
    // 中心点を元に戻す
    uvPrime += vec2(0.5);
    
    // トランジション効果のための補間係数
    float t = smoothstep(0.0, 1.0, r);
    
    // エッジでのフェードアウト
    float edge = smoothstep(1.0, 0.9, r);
    
    // テクスチャのサンプリング
    if (uvPrime.x < 0.0 || uvPrime.x > 1.0 || 
        uvPrime.y < 0.0 || uvPrime.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        vec4 color = texture2D(uTexture, uvPrime);
        
        // エッジでのフェードアウトを適用
        color = mix(vec4(0.0, 0.0, 0.0, 1.0), color, edge);
        
        // 中心からの距離に応じたトランジション
        vec4 originalColor = texture2D(uTexture, vUv);
        gl_FragColor = mix(color, originalColor, t * (1.0 - edge));
    }
}

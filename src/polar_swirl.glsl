// shaders/effects/polar_swirl.glsl

#include header.glsl


// 複合的な歪み効果
//   半径方向の正弦波による歪み
//   半径に応じた回転
//   時間による変調
// 
// 高度なブレンディング
//   渦の強さに応じた動的なブレンド
//   エッジでのスムーズなフェードアウト
//   距離に応じた効果の減衰
// 
// アニメーション
//   時間依存の回転効果
//   動的な渦の強さの計算
// 


// エフェクト固有のuniform変数
uniform float uAlpha;     // 半径方向の歪みの強さ
uniform float uBeta;      // 角度依存の周波数
uniform float uK;         // 回転係数

void main() {
    // UV座標を中心を原点として変換
    vec2 uv = transformUV(vUv, vec2(0.5));
    
    // デカルト座標から極座標へ変換
    float r, theta;
    cartesianToPolar(uv, r, theta);
    
    // Polar Swirl変換の適用
    // 1. 半径方向の正弦歪み
    float radialDistortion = uAlpha * sin(uBeta * theta);
    float rPrime = r + radialDistortion;
    
    // 2. 半径に応じた回転
    float angularDistortion = uK * r;
    float thetaPrime = theta + angularDistortion;
    
    // 3. 時間による変調（オプション）
    thetaPrime += 0.2 * sin(uTime) * r;
    
    // 4. 距離に応じた効果の減衰
    float distanceFactor = smoothstep(1.0, 0.0, r);
    rPrime = mix(r, rPrime, distanceFactor);
    
    // 極座標からデカルト座標へ戻す
    vec2 uvPrime = polarToCartesian(rPrime, thetaPrime);
    
    // 中心点を元に戻す
    uvPrime += vec2(0.5);
    
    // エッジ処理
    float edge = smoothstep(1.0, 0.8, r);
    
    // 渦の強さに応じたブレンド係数
    float swirlStrength = length(uv - uvPrime) * 2.0;
    float blendFactor = smoothstep(0.0, 0.5, swirlStrength);
    
    // テクスチャのサンプリング
    if (uvPrime.x < 0.0 || uvPrime.x > 1.0 || 
        uvPrime.y < 0.0 || uvPrime.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        // 変形後のテクスチャ
        vec4 swirlColor = texture2D(uTexture, uvPrime);
        
        // 元のテクスチャ
        vec4 originalColor = texture2D(uTexture, vUv);
        
        // 渦の強さに応じたブレンド
        vec4 blendedColor = mix(
            originalColor,
            swirlColor,
            blendFactor * edge
        );
        
        // エッジフェードの適用
        gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 1.0), blendedColor, edge);
    }
}

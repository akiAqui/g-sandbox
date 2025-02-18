// shaders/effects/double_spiral_zoom.glsl

#include header.glsl

// 
// 複合的な回転効果
//   線形回転成分
//   対数回転成分
//   両者の組み合わせによる複雑な渦巻きパターン
// 
// ダイナミックな変形
//   ズーム効果
//   時間による変調
//   距離に応じた効果の減衰
// 
// 視覚的な強調
//   中心部でのグロー効果
//   渦の強さに基づく動的なブレンド
//   スムーズなエッジ処理
// 




// エフェクト固有のuniform変数
uniform float uK1;        // 線形回転係数
uniform float uK2;        // 対数回転係数
uniform float uGamma;     // ズーム係数
uniform float uEpsilon;   // 小さな定数（0除算防止）

void main() {
    // UV座標を中心を原点として変換
    vec2 uv = transformUV(vUv, vec2(0.5));
    
    // デカルト座標から極座標へ変換
    float r, theta;
    cartesianToPolar(uv, r, theta);
    
    // Double Spiral Zoom変換の適用
    // 1. 線形成分と対数成分を組み合わせた回転
    float linearRotation = uK1 * r;
    float logRotation = uK2 * log(r + uEpsilon);
    float thetaPrime = theta + linearRotation + logRotation;
    
    // 2. ズーム効果の適用
    float rPrime = r * uGamma;
    
    // 3. 時間による変調
    float timeEffect = sin(uTime * 0.5);
    thetaPrime += timeEffect * log(r + uEpsilon);
    rPrime *= 1.0 + 0.1 * timeEffect;
    
    // 4. 渦の強さの計算
    float spiralStrength = abs(linearRotation) + abs(logRotation);
    
    // 極座標からデカルト座標へ戻す
    vec2 uvPrime = polarToCartesian(rPrime, thetaPrime);
    
    // 中心点を元に戻す
    uvPrime += vec2(0.5);
    
    // エッジ処理
    float edge = smoothstep(1.0, 0.8, r);
    
    // 距離に応じた効果の減衰
    float distanceFactor = smoothstep(1.0, 0.0, r);
    
    // ブレンド係数の計算
    float blendFactor = smoothstep(0.0, 0.5, spiralStrength * distanceFactor);
    
    // テクスチャのサンプリング
    if (uvPrime.x < 0.0 || uvPrime.x > 1.0 || 
        uvPrime.y < 0.0 || uvPrime.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        // 変形後のテクスチャ
        vec4 spiralColor = texture2D(uTexture, uvPrime);
        
        // 元のテクスチャ
        vec4 originalColor = texture2D(uTexture, vUv);
        
        // 渦の強さに応じたブレンド
        vec4 blendedColor = mix(
            originalColor,
            spiralColor,
            blendFactor * edge
        );
        
        // 中心部での光の効果
        float centerGlow = pow(1.0 - r, 2.0) * spiralStrength * 0.3;
        vec4 glowColor = vec4(1.0, 1.0, 1.0, 1.0) * centerGlow;
        blendedColor += glowColor;
        
        // エッジフェードの適用
        gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 1.0), blendedColor, edge);
    }
}

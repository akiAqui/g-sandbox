// shaders/effects/spiral_vortex.glsl

#include header.glsl

// 
// 指数関数的な減衰
//   中心部での強い渦効果
//   外側に向かって急速に減衰
//   滑らかな遷移
// 
// 複合的な変形効果
//   基本的な渦巻き変形
//   半径方向の周期的な歪み
//   時間による変調
// 
// 視覚的な強調効果
//   中心部でのグロー効果
//   渦の強さに基づく動的なブレンド
//   エッジでのスムーズなフェードアウト
// 



// エフェクト固有のuniform変数
uniform float uAlpha;     // 渦の強さ
uniform float uBeta;      // 減衰係数
varying vec2 vUv;

void main() {
    // UV座標を中心を原点として変換
    vec2 uv = transformUV(vUv, vec2(0.5));
    
    // デカルト座標から極座標へ変換
    float r, theta;
    cartesianToPolar(uv, r, theta);
    
    // Spiral Vortex変換の適用
    // 1. 指数関数による減衰を計算
    float decay = exp(-uBeta * r);
    
    // 2. 回転角の計算
    float rotationAngle = uAlpha * decay;
    
    // 3. 時間による変調（オプション）
    rotationAngle += 0.5 * sin(uTime) * decay;
    
    // 4. 最終的な角度を計算
    float thetaPrime = theta + rotationAngle;
    
    // 5. 半径方向の歪み（渦の強さに応じて）
    float rPrime = r * (1.0 + 0.1 * rotationAngle * sin(theta * 4.0));
    
    // 極座標からデカルト座標へ戻す
    vec2 uvPrime = polarToCartesian(rPrime, thetaPrime);
    
    // 中心点を元に戻す
    uvPrime += vec2(0.5);
    
    // エッジ処理
    float edge = smoothstep(1.0, 0.8, r);
    
    // 渦の強さによるブレンド係数
    float vortexStrength = abs(rotationAngle) * r;
    float blendFactor = smoothstep(0.0, 0.5, vortexStrength);
    
    // テクスチャのサンプリング
    if (uvPrime.x < 0.0 || uvPrime.x > 1.0 || 
        uvPrime.y < 0.0 || uvPrime.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        // 変形後のテクスチャ
        vec4 vortexColor = texture2D(uTexture, uvPrime);
        
        // 元のテクスチャ
        vec4 originalColor = texture2D(uTexture, vUv);
        
        // 渦の強さに応じたブレンド
        vec4 blendedColor = mix(
            originalColor,
            vortexColor,
            blendFactor * edge
        );
        
        // 渦の中心付近での光の効果
        float centerGlow = (1.0 - r) * decay * 0.1;
        blendedColor += vec4(centerGlow);
        
        // エッジフェードの適用
        gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 1.0), blendedColor, edge);
    }
}

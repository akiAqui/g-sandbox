#include header.glsl

uniform float uAmpX;      // X方向の振幅
uniform float uAmpY;      // Y方向の振幅
uniform float uFreqX;     // X方向の周波数
uniform float uFreqY;     // Y方向の周波数
varying vec2 vUv;

void main() {
    // UV座標を中心を原点として変換
    vec2 uv = transformUV(vUv, vec2(0.5));
    
    // デカルト座標から極座標へ変換
    float r, theta;
    cartesianToPolar(uv, r, theta);
    
    // Sinusoidal Warp変換の適用
    // 1. X方向のサイン波による変形
    float warpX = uAmpX * sin(uFreqX * uv.x + uTime);
    
    // 2. Y方向のコサイン波による変形
    float warpY = uAmpY * cos(uFreqY * uv.y + uTime);
    
    // 3. 距離に応じた減衰効果
    float dist = length(uv);
    float attenuation = smoothstep(1.0, 0.0, dist);
    
    // 4. 最終的な変位を計算
    vec2 uvPrime = vUv;
    uvPrime.x += warpX * attenuation;
    uvPrime.y += warpY * attenuation;
    
    // 追加の波動効果（より複雑な動きのため）
    float secondaryWave = sin(dist * 10.0 - uTime * 2.0) * 0.02;
    uvPrime += secondaryWave * attenuation * vec2(cos(theta), sin(theta));
    
    // エッジ処理
    float edge = smoothstep(1.0, 0.8, dist);
    
    // 変形の強さに基づくブレンド係数
    float warpStrength = length(vec2(warpX, warpY));
    float blendFactor = smoothstep(0.0, 0.1, warpStrength);
    
    // テクスチャのサンプリング
    if (uvPrime.x < 0.0 || uvPrime.x > 1.0 || 
        uvPrime.y < 0.0 || uvPrime.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        // 変形後のテクスチャ
        vec4 warpedColor = texture2D(uTexture, uvPrime);
        
        // 元のテクスチャ
        vec4 originalColor = texture2D(uTexture, vUv);
        
        // 変形の強さに応じたブレンド
        vec4 blendedColor = mix(
            originalColor,
            warpedColor,
            blendFactor * edge
        );
        
        // 波動効果の強調
        float waveFactor = secondaryWave * 5.0 + 0.5;
        blendedColor *= mix(1.0, waveFactor, attenuation * 0.3);
        
        // エッジフェードの適用
        gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 1.0), blendedColor, edge);
    }
}

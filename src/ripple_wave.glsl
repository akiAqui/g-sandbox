// shaders/effects/ripple_wave.glsl

#include header.glsl

// 複合的な波動効果
//   中心からの放射状の波
//   X方向とY方向の独立した波動
//   時間による波動のアニメーション

// 洗練された視覚効果
//   距離に応じた波動の減衰
//   クロスフェード効果による自然な遷移
//   エッジでのスムーズなフェードアウト
// 
// パラメータによる柔軟な制御
//   X/Y方向の振幅の独立した制御
//   波の周波数と位相の調整
// 


// エフェクト固有のuniform変数
uniform float uAmpX;      // X方向の振幅
uniform float uAmpY;      // Y方向の振幅
uniform float uOmega;     // 波の周波数
uniform float uPhase;     // 位相

void main() {
    // UV座標を中心を原点として変換
    vec2 uv = transformUV(vUv, vec2(0.5));
    
    // 中心からの距離を計算
    float dist = length(uv);
    
    // 波動変形の計算
    // 1. 基本の波動
    float wave = sin(uOmega * dist - uPhase + uTime);
    
    // 2. X方向とY方向の独立した波動
    float waveX = sin(uOmega * uv.y + uPhase + uTime);
    float waveY = sin(uOmega * uv.x + uPhase + uTime);
    
    // 3. 距離に応じた減衰
    float attenuation = smoothstep(1.0, 0.0, dist);
    
    // 最終的な変位を計算
    vec2 uvPrime = vUv;
    uvPrime.x += uAmpX * wave * waveX * attenuation;
    uvPrime.y += uAmpY * wave * waveY * attenuation;
    
    // エッジ処理のための係数
    float edge = smoothstep(1.0, 0.8, dist);
    
    // クロスフェード効果のための係数
    float crossfade = smoothstep(0.8, 0.4, dist);
    
    // テクスチャのサンプリング
    if (uvPrime.x < 0.0 || uvPrime.x > 1.0 || 
        uvPrime.y < 0.0 || uvPrime.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        // メインの変形テクスチャ
        vec4 distortedColor = texture2D(uTexture, uvPrime);
        
        // 元のテクスチャ
        vec4 originalColor = texture2D(uTexture, vUv);
        
        // クロスフェードと波動効果の合成
        vec4 finalColor = mix(
            distortedColor,
            originalColor,
            crossfade * (1.0 - abs(wave))
        );
        
        // エッジフェードの適用
        gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 1.0), finalColor, edge);
    }
}

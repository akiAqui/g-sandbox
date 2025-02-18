// shaders/effects/nested_sine_cosine.glsl

#include header.glsl

// 入れ子になった三角関数による複雑な変形
//   内側のサイン関数による基本的な変形
//   外側のコサイン関数による変形の変調
//
// 距離に応じた効果の制御
//   中心からの距離に応じた効果の減衰
//   エッジでのスムーズなフェードアウト
//
// アニメーション効果
//   時間による変位の変調
//   X軸方向への二次的な変位
//
// 視覚的な調整
//   エッジ処理による自然な境界
//   距離に応じた効果の強調

// エフェクト固有のuniform変数
uniform float uFreq1;     // 内側の周波数
uniform float uFreq2;     // 外側の周波数
uniform float uAmp;       // 振幅
varying vec2 vUv;

void main() {
    // UV座標を中心を原点として変換
    vec2 uv = transformUV(vUv, vec2(0.5));
    
    // デカルト座標から極座標へ変換
    float r, theta;
    cartesianToPolar(uv, r, theta);
    
    // Nested Sine-Cosine変換の適用
    // 1. 内側のサイン関数
    float innerSine = sin(theta * uFreq1);
    
    // 2. 外側のコサイン関数
    float nestedEffect = cos(innerSine * uFreq2);
    
    // 3. 距離に応じた効果の減衰
    float distanceFactor = smoothstep(1.0, 0.0, r);
    
    // 4. 最終的な変位を計算
    float displacement = nestedEffect * uAmp * distanceFactor;
    
    // 変位を適用
    vec2 uvPrime = vUv;
    uvPrime.y += displacement;
    
    // アニメーション効果の追加（時間による変調）
    float timeEffect = sin(uTime * 0.5);
    uvPrime.x += displacement * timeEffect * 0.2;
    
    // エッジ処理
    float edge = smoothstep(1.0, 0.8, r);
    
    // テクスチャのサンプリング
    if (uvPrime.x < 0.0 || uvPrime.x > 1.0 || 
        uvPrime.y < 0.0 || uvPrime.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        vec4 color = texture2D(uTexture, uvPrime);
        
        // エッジでのフェードアウトを適用
        vec4 originalColor = texture2D(uTexture, vUv);
        gl_FragColor = mix(originalColor, color, edge);
        
        // 距離に応じた効果の強調
        gl_FragColor *= (1.0 - distanceFactor * 0.2);
    }
}

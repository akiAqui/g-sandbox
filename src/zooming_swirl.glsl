// shaders/effects/zooming_swirl.glsl

#include header.glsl

// 
// 時間ベースの変形
//   連続的なズーム効果
//   一定速度での回転
//   周期的なパルス効果
// 
// 複合的なアニメーション
//   距離に応じた回転の変調
//   時間に基づくトランジション
//   パルス効果による生命感の付加
// 
// 高度なブレンディング
//   ズームと回転の強さに基づく動的なブレンド
//   スムーズなエッジ処理
//   トランジション効果の組み込み
// 



// エフェクト固有のuniform変数
uniform float uDelta;     // ズーム速度
uniform float uK;         // 回転速度

void main() {
    // UV座標を中心を原点として変換
    vec2 uv = transformUV(vUv, vec2(0.5));
    
    // デカルト座標から極座標へ変換
    float r, theta;
    cartesianToPolar(uv, r, theta);
    
    // Zooming Swirl変換の適用
    // 1. 時間に基づくズーム効果
    float zoomFactor = 1.0 + uDelta * uTime;
    float rPrime = r * zoomFactor;
    
    // 2. 時間に基づく回転
    float rotationAngle = uK * uTime;
    float thetaPrime = theta + rotationAngle;
    
    // 3. 周期的なパルス効果の追加
    float pulse = 1.0 + 0.1 * sin(uTime * 2.0);
    rPrime *= pulse;
    
    // 4. 距離に応じた効果の変調
    float distanceFactor = smoothstep(1.0, 0.0, r);
    float modulatedTheta = thetaPrime + distanceFactor * sin(uTime);
    
    // 極座標からデカルト座標へ戻す
    vec2 uvPrime = polarToCartesian(rPrime, modulatedTheta);
    
    // 中心点を元に戻す
    uvPrime += vec2(0.5);
    
    // エッジ処理とトランジション効果
    float edge = smoothstep(1.0, 0.8, r);
    float transitionFactor = smoothstep(0.0, 0.5, abs(sin(uTime)));
    
    // テクスチャのサンプリング
    if (uvPrime.x < 0.0 || uvPrime.x > 1.0 || 
        uvPrime.y < 0.0 || uvPrime.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        // 変形後のテクスチャ
        vec4 swirlColor = texture2D(uTexture, uvPrime);
        
        // 元のテクスチャ
        vec4 originalColor = texture2D(uTexture, vUv);
        
        // ズームと回転の強さに応じたブレンド
        float blendStrength = length(uv - uvPrime) * zoomFactor;
        float blendFactor = smoothstep(0.0, 0.5, blendStrength);
        
        // 最終的なカラーの計算
        vec4 finalColor = mix(
            originalColor,
            swirlColor,
            blendFactor * transitionFactor
        );
        
        // エッジフェードの適用
        gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 1.0), finalColor, edge);
    }
}

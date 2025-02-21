// shaders/effects/twirl.glsl

#include header.glsl


//中心からの距離に応じた非線形な回転
//べき乗関数による回転量の制御
//エッジでのスムーズなフェードアウト効果
//範囲外のUV座標の適切な処理

// エフェクト固有のuniform変数
uniform float uAmount;    // 渦の強さ
uniform float uRateOfTime;
uniform float uBeta;      // 非線形性パラメータ
varying vec2 vUv;

void main() {
    // UV座標を中心を原点として変換
    vec2 uv = transformUV(vUv, vec2(0.5));
    
    // デカルト座標から極座標へ変換
    float r, theta;
    cartesianToPolar(uv, r, theta);
    
    // Twirl変換の適用
    // 1. 半径に応じた回転量の計算（非線形性を考慮）
    float rotation = uAmount * pow(r, uBeta);

    float timeComponent = sin(uTime*uRateOfTime); // added by aki
    
    // 2. 角度の更新
    float thetaPrime = theta + rotation*timeComponent; // mod by aki
    
    // 3. 半径は変更なし
    float rPrime = r;
    
    // 極座標からデカルト座標へ戻す
    vec2 uvPrime = polarToCartesian(rPrime, thetaPrime);
    
    // 中心点を元に戻す
    uvPrime += vec2(0.5);
    
    // エッジ処理: スムーズなフェードアウト
    float edge = smoothstep(1.0, 0.8, r);
    
    // テクスチャのサンプリング
    // UV座標が範囲外の場合は黒を返す
    if (uvPrime.x < 0.0 || uvPrime.x > 1.0 || 
        uvPrime.y < 0.0 || uvPrime.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        vec4 color = texture2D(uTexture, uvPrime);
        // エッジでのフェードアウトを適用
        gl_FragColor = mix(vec4(0.0, 0.0, 0.0, 1.0), color, edge);
    }
}

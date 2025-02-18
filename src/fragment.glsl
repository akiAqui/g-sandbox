precision mediump float;

uniform sampler2D texture1;
uniform vec2 a, b, c, d;
varying vec2 vUv;

vec2 mobiusTransform(vec2 z) {
    vec2 num = a * z + b;
    vec2 den = c * z + d;
    return num / den;
}

vec3 inverseStereographicProjection(vec2 w) {
    float modSq = dot(w, w);
    modSq = min(modSq, 100.0); // 安定化
    float Z = (1.0 - modSq) / (1.0 + modSq);
    Z = clamp(Z, -0.9999, 0.9999); // Z の制限

    return vec3(
        2.0 * w.x / (1.0 + modSq),
        2.0 * w.y / (1.0 + modSq),
        Z
    );
}

// ランベルト正積図法の適用
vec2 lambertProjection(vec3 sphere) {
    float lon = atan(sphere.z, sphere.x);
    float lat = asin(sphere.y);
    return vec2(
        lon / (2.0 * 3.14159265359) + 0.5,
        0.5 * (1.0 + sin(lat))
    );
}

void main() {
    // 1. UV座標を [-1,1] の複素平面として扱う
    vec2 z = vUV * 2.0 - 1.0;

    // 2. メビウス変換適用
    vec2 transformed = mobiusTransform(z);

    // 3. 逆ステレオ射影で球面座標へ
    vec3 sphereCoords = inverseStereographicProjection(transformed);

    // 4. ランベルト正積図法で投影
    vec2 uv = lambertProjection(sphereCoords);

    // 5. Three.js の `PlaneGeometry` のデフォルト UV 配置を修正
    gl_FragColor = texture2D(texture1, vec2(uv.x, 1.0 - uv.y));
}


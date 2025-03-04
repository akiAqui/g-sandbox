uniform sampler2D diffuseMap;
uniform sampler2D normalMap;
uniform vec3 lightPosition;
uniform int lightType;
uniform float lightIntensity;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // テクスチャからの色取得
  vec4 diffuseColor = texture2D(diffuseMap, vUv);
  
  // 法線マップからの法線取得と変換
  vec3 normalColor = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
  // 法線マップの影響を非常に強く
  vec3 N = normalize(mix(vNormal, normalColor, 2.0));
  
  // ライティング計算
  vec3 L = normalize(lightPosition - vViewPosition);
  
  // 拡散反射（より強調）
  float diff = pow(max(dot(N, L), 0.0), 0.75) * 1.5;
  vec3 diffuse = diffuseColor.rgb * diff * lightIntensity;
  
  // スペキュラ反射（より強く、より広く）
  vec3 V = normalize(-vViewPosition);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 16.0) * 2.0;
  vec3 specular = vec3(1.0) * spec * lightIntensity;
  
  // 環境光（暗めに）
  vec3 ambient = diffuseColor.rgb * 0.1;
  
  // リムライティングの追加（輪郭強調）
  float rim = 1.0 - max(dot(V, N), 0.0);
  rim = pow(rim, 3.0);
  vec3 rimLight = vec3(0.3) * rim * lightIntensity;
  
  gl_FragColor = vec4(ambient + diffuse + specular + rimLight, diffuseColor.a);
}

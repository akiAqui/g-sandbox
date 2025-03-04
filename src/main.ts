import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min';
import { createProceduralTexture, createNormalMap } from './textureGenerator';

// シェーダーのインポート
import vertexShader from './vertex.glsl';
import fragmentShader from './fragment.glsl';

// シーンのセットアップ
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('app')?.appendChild(renderer.domElement);

// カメラの位置設定
camera.position.set(0, 0, 3);
camera.lookAt(0, 0, 0);


// コントロールの追加
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// カメラの位置設定を以下のように変更してください
camera.position.set(0, 0, 3);
camera.lookAt(0, 0, 0);
// ライトの設定
const lights = {
  pointLight: new THREE.PointLight(0xffffff, 1),
  directionalLight: new THREE.DirectionalLight(0xffffff, 1),
  spotLight: new THREE.SpotLight(0xffffff, 1),
};

// 初期ライトの設定
lights.pointLight.position.set(5, 5, 5);
lights.directionalLight.position.set(5, 5, 5);
lights.spotLight.position.set(5, 5, 5);
scene.add(lights.pointLight);

// テクスチャの生成
const textureSize = 512;
const diffuseTexture = createProceduralTexture(textureSize);
const normalTexture = createNormalMap(textureSize);

// マテリアルの作成
const material = new THREE.ShaderMaterial({
  uniforms: {
    diffuseMap: { value: diffuseTexture },
    normalMap: { value: normalTexture },
    lightPosition: { value: new THREE.Vector3(5, 5, 5) },
    lightType: { value: 0 }, // 0: point, 1: directional, 2: spot
    lightIntensity: { value: 1.0 }
  },
  vertexShader,
  fragmentShader
});

// ジオメトリの作成と平面の追加
const geometry = new THREE.PlaneGeometry(10, 10);
const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// GUIの設定
const gui = new GUI({ container: document.getElementById('gui-container') });
const lightControls = {
  type: 'point',
  intensity: 1.0,
  position: { x: 5, y: 5, z: 5 }
};

gui.add(lightControls, 'type', ['point', 'directional', 'spot']).onChange((value) => {
  scene.remove(lights.pointLight);
  scene.remove(lights.directionalLight);
  scene.remove(lights.spotLight);
  
  switch(value) {
    case 'point':
      scene.add(lights.pointLight);
      material.uniforms.lightType.value = 0;
      break;
    case 'directional':
      scene.add(lights.directionalLight);
      material.uniforms.lightType.value = 1;
      break;
    case 'spot':
      scene.add(lights.spotLight);
      material.uniforms.lightType.value = 2;
      break;
  }
});

gui.add(lightControls, 'intensity', 0, 2).onChange((value) => {
  material.uniforms.lightIntensity.value = value;
  Object.values(lights).forEach(light => light.intensity = value);
});

const positionFolder = gui.addFolder('Light Position');
positionFolder.add(lightControls.position, 'x', -30, 30).onChange(updateLightPosition);
positionFolder.add(lightControls.position, 'y', -30, 30).onChange(updateLightPosition);
positionFolder.add(lightControls.position, 'z', -30, 30).onChange(updateLightPosition);

function updateLightPosition() {
  const pos = new THREE.Vector3(
    lightControls.position.x,
    lightControls.position.y,
    lightControls.position.z
  );
  material.uniforms.lightPosition.value = pos;
  Object.values(lights).forEach(light => light.position.copy(pos));
}

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// リサイズ対応
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

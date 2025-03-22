import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
import fragmentShader from './fragment.glsl';
import vertexShader from './vertex.glsl';

// 基本設定
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// TrackballControls
const controls = new TrackballControls(camera, renderer.domElement);


// アトラクタの定義 (3つ、0 ~ 1 の範囲)
const attractors = [
  { position: new THREE.Vector3(0.75, 0.5, 0.0), strength: -1.5 },
  { position: new THREE.Vector3(0.15, 0.5, 0.0), strength: 1.2 },
  { position: new THREE.Vector3(0.5, 0.75, 0.0), strength: 0.7 }
];



// GUI要素の取得
const noiseTypeSelect = document.getElementById('noise-type') as HTMLSelectElement;
const octavesInput = document.getElementById('octaves') as HTMLInputElement;
const amplitudeInput = document.getElementById('amplitude') as HTMLInputElement;
const frequencyInput = document.getElementById('frequency') as HTMLInputElement;

// GUIのイベントリスナー
noiseTypeSelect.addEventListener('change', () => {
    material.uniforms.noiseType.value = noiseTypeSelect.value === 'perlin' ? 0 : 1;
});

octavesInput.addEventListener('input', () => {
    material.uniforms.octaves.value = parseInt(octavesInput.value);
});

amplitudeInput.addEventListener('input', () => {
    material.uniforms.amplitude.value = parseFloat(amplitudeInput.value);
});

frequencyInput.addEventListener('input', () => {
    material.uniforms.frequency.value = parseFloat(frequencyInput.value);
});

// アトラクタ選択用変数
let selectedAttractorIndex = -1;

// マウスクリックイベントリスナー追加
renderer.domElement.addEventListener('click', (event) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const clickPosition = new THREE.Vector3(x, y, 0);

    // 最も近いアトラクタを選択
    let minDistance = Infinity;
    attractors.forEach((attractor, index) => {
        const distance = clickPosition.distanceTo(attractor.position);
        if (distance < minDistance && distance < 0.2) { // 0.2 は選択範囲の大きさを調整
            minDistance = distance;
            selectedAttractorIndex = index;
        }
    });

    // アトラクタが選択された場合、その位置を更新
    if (selectedAttractorIndex !== -1) {
        // アトラクタ位置を更新 (NDC 座標系)
        attractors[selectedAttractorIndex].position.set(x, y, 0);

        // シェーダーへ更新を反映 (0 ~ 1 に変換)
        material.uniforms.attractorPositions.value = attractors.flatMap(a => [
            (a.position.x + 1) / 2,
            (a.position.y + 1) / 2,
            a.position.z
        ]);
    }
});



// ジオメトリとマテリアル
const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    time: { value: 0.0 },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    attractorPositions: { value: attractors.flatMap(a => [a.position.x, a.position.y, a.position.z]) },
    attractorStrengths: { value: attractors.map(a => a.strength) },
    numAttractors: { value: attractors.length },
    noiseType: { value: 0 },
    octaves: { value: 3 },
    amplitude: { value: 0.5 },
    frequency: { value: 2.0 }
  }
});

console.log("Attractor Positions:", attractors.flatMap(a => [a.position.x, a.position.y, a.position.z]));



const plane = new THREE.Mesh(geometry, material);
scene.add(plane);

// リサイズ対応
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
});

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  material.uniforms.time.value += 0.01;
  renderer.render(scene, camera);
}

animate();


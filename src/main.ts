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
  { position: new THREE.Vector3(0.75, 0.5, 0.0), strength:  0.9 },
  { position: new THREE.Vector3(0.15, 0.5, 0.0), strength: -0.9 },
  { position: new THREE.Vector3(0.5,  0.75, 0.0), strength: 0.7 },
  { position: new THREE.Vector3(0.25, 0.15, 0.0), strength: -0.7 }  
];

const patternTypeSelect=document.getElementById('pattern-type') as HTMLSelectElement;
patternTypeSelect.addEventListener('change',()=>{
  material.uniforms.patternType.value=parseInt(patternTypeSelect.value);
});

//
// UI制御
//
const uiElements = document.querySelectorAll(".ui-element");
const canvas = document.querySelector("canvas")!;
const hideBtn = document.getElementById("hide-ui")!;

// 現在の表示状態をチェックして切り替え
function toggleUI() {
  const hidden = uiElements[0].style.display === "none";
  uiElements.forEach(el => {
    (el as HTMLElement).style.display = hidden ? "" : "none";
  });
}

// タッチイベントで2本指検出
window.addEventListener("touchstart", (e) => {
  if (e.touches.length === 2) {
    e.preventDefault(); // ジェスチャー拡大防止（必要に応じて）
    toggleUI();
  }
}, { passive: false });



// UI全体を非表示
function hideUI() {
  uiElements.forEach(el => {
    (el as HTMLElement).style.display = "none";
  });
}

// UI全体を再表示
function showUI() {
  uiElements.forEach(el => {
    (el as HTMLElement).style.display = "";
  });
}

// キャプチャ処理
hideBtn.addEventListener("click", async () => {
  hideUI();

  // フレーム待ち
  //await new Promise(requestAnimationFrame);
  // canvasキャプチャ
  //  const dataURL = canvas.toDataURL("image/png");
  //  downloadImage(dataURL);

  // UIは表示せず、ダブルクリック待ち
});

// ダブルクリックでUIを表示
window.addEventListener("dblclick", () => {
  showUI();
});

// ダウンロード処理
//function downloadImage(dataUrl: string) {
//  const a = document.createElement("a");
//  a.href = dataUrl;
//  a.download = "capture.png";
//  a.click();
//}




/*
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
*/
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
//
// 注意：
// uniformsに渡す変数をミュータブルに操作したい場合、
// 事前に配列変数を定義し、その参照を uniform.value に渡す必要がある
//
//
//const attractorPositionsArray = attractors.flatMap(a => [a.position.x, a.position.y, a.position.z]);
//const attractorStrengthsArray = attractors.map(a => a.strength);
//
// ShaderMaterialで「参照渡し!」をする
//
//const material = new THREE.ShaderMaterial({
//  vertexShader,
//  fragmentShader,
//  uniforms: {
//    attractorPositions: { value: attractorPositionsArray },
//    attractorStrengths: { value: attractorStrengthsArray },
//
// その後変更するときは
//
// attractorPositionsArray[0] += 0.01;
// attractorStrengthsArray[1] = 1.5;
//
// のようにするのもわかりやすい





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
    patternType:   { value: 0},
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
  //material.uniforms.attractorPositions.value[0] = (material.uniforms.attractorPositions.value[0] + 0.001) % 1;
  //material.uniforms.attractorPositions.value[1] = (material.uniforms.attractorPositions.value[1] + 0.001) % 1;

  if (material.uniforms.patternType.value == 0) {
    // 下記の2行は、xの値と、1-xを行ったり来たりするので一つあるはずのアトラクタが二つに見える！！！これ凄い！
    material.uniforms.attractorPositions.value[0] = Math.abs((material.uniforms.attractorPositions.value[0] ) % 2 - 1);
    material.uniforms.attractorPositions.value[1] = Math.abs((material.uniforms.attractorPositions.value[1] ) % 2 - 1);
    material.uniforms.attractorStrengths.value[0]=1.5*Math.sin(material.uniforms.time.value);
  }
  
  renderer.render(scene, camera);
}

animate();


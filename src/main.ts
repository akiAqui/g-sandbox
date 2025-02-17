import * as THREE from "three";
import GUI from "lil-gui";
import vertexShader from "./vertex.glsl";
import fragmentShader from "./fragment.glsl";

// HTML 要素取得
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const saveButton = document.getElementById("saveButton") as HTMLButtonElement;
const canvas = document.getElementById("glCanvas") as HTMLCanvasElement;

// Three.js シーン & カメラ設定
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.z = 1;

const renderer = new THREE.WebGLRenderer({ canvas,preserveDrawingBuffer: true});
renderer.setSize(window.innerWidth, window.innerHeight);

// メビウス変換パラメータ
const mobiusParams = {
  a: { real: 1.0, imag: 1.0 },
  b: { real: 2.0, imag: -1.0 },
  c: { real: 3.0, imag: 2.0 },
  d: { real: 4.0, imag: -2.0 },
};

// lil-gui を追加
const gui = new GUI();
const folders = ["a", "b", "c", "d"];
folders.forEach((param) => {
  const folder = gui.addFolder(param);
  folder.add(mobiusParams[param as keyof typeof mobiusParams], "real", -50.0, 50.0, 0.1).name("Re");
  folder.add(mobiusParams[param as keyof typeof mobiusParams], "imag", -50.0, 50.0, 0.1).name("Im");
});

// シェーダーマテリアル
const uniforms = {
  texture1: { value: new THREE.Texture() },
  a: { value: new THREE.Vector2(mobiusParams.a.real, mobiusParams.a.imag) },
  b: { value: new THREE.Vector2(mobiusParams.b.real, mobiusParams.b.imag) },
  c: { value: new THREE.Vector2(mobiusParams.c.real, mobiusParams.c.imag) },
  d: { value: new THREE.Vector2(mobiusParams.d.real, mobiusParams.d.imag) },
};

const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms,
});

const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(plane);

// 描画ループ
function render() {
  renderer.render(scene, camera);
}
render();

// GUI の値を uniforms に反映
gui.onChange(() => {
  uniforms.a.value.set(mobiusParams.a.real, mobiusParams.a.imag);
  uniforms.b.value.set(mobiusParams.b.real, mobiusParams.b.imag);
  uniforms.c.value.set(mobiusParams.c.real, mobiusParams.c.imag);
  uniforms.d.value.set(mobiusParams.d.real, mobiusParams.d.imag);
  render();
});

// 画像をロードしてテクスチャに適用
fileInput.addEventListener("change", (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const texture = new THREE.Texture(img);
      texture.needsUpdate = true;
      uniforms.texture1.value = texture;
      render();
    };
    img.src = e.target?.result as string;
  };
  reader.readAsDataURL(file);
});

// 変換後のテクスチャを保存
saveButton.addEventListener("click", () => {
  renderer.domElement.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "output_texture.png";
    link.click();
  });
});


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
// ディレクトリ管理
let jsonDirectory: FileSystemDirectoryHandle | null = null;
let textureInputDirectory: FileSystemDirectoryHandle | null = null;
let textureOutputDirectory: FileSystemDirectoryHandle | null = null;

// GUI に time パラメータを追加
const timeParams = {
  time: 0
};
gui.add(timeParams, 'time', 0, 100, 0.1).name('Time');

// ディレクトリ選択ボタンの処理
const selectJsonDirButton = document.getElementById('selectJsonDirButton') as HTMLButtonElement;
const selectInputTextureDirButton = document.getElementById('selectInputTextureDirButton') as HTMLButtonElement;
const selectOutputTextureDirButton = document.getElementById('selectOutputTextureDirButton') as HTMLButtonElement;

const jsonDirDisplay = document.getElementById('jsonDir') as HTMLDivElement;
const inputTextureDirDisplay = document.getElementById('inputTextureDir') as HTMLDivElement;
const outputTextureDirDisplay = document.getElementById('outputTextureDir') as HTMLDivElement;

// ディレクトリ選択のヘルパー関数
async function selectDirectory(displayElement: HTMLElement, setter: (dir: FileSystemDirectoryHandle) => void): Promise<void> {
  try {
    const directory = await window.showDirectoryPicker();
    setter(directory);
    displayElement.textContent = `選択中: ${directory.name}`;
  } catch (err) {
    console.error('Directory selection failed:', err);
    displayElement.textContent = '選択失敗';
  }
}

// 各ディレクトリ選択ボタンのイベントリスナー
selectJsonDirButton.addEventListener('click', () => 
  selectDirectory(jsonDirDisplay, (dir) => jsonDirectory = dir));

selectInputTextureDirButton.addEventListener('click', () => 
  selectDirectory(inputTextureDirDisplay, (dir) => textureInputDirectory = dir));

selectOutputTextureDirButton.addEventListener('click', () => 
  selectDirectory(outputTextureDirDisplay, (dir) => textureOutputDirectory = dir));

// JSON読み込み機能
const jsonInput = document.getElementById('jsonInput') as HTMLInputElement;
const loadJsonButton = document.getElementById('loadJsonButton') as HTMLButtonElement;

loadJsonButton.addEventListener('click', () => {
  if (!jsonDirectory) {
    alert('JSONディレクトリを先に選択してください。');
    return;
  }
  jsonInput.click();
});

jsonInput.addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !jsonDirectory) return;

  try {
    // ファイル名のチェック
    if (!file.name.toLowerCase().endsWith('.json')) {
      throw new Error('Selected file is not a JSON file');
    }
    const text = await file.text();
    const jsonData = JSON.parse(text);
    
    // time と prm が存在するか確認
    if (typeof jsonData.time === 'undefined' || !jsonData.prm) {
      throw new Error('Invalid JSON format: missing time or prm');
    }
    
    // GUI の値を更新
    timeParams.time = jsonData.time;
    
    // メビウスパラメータを更新
    for (const [key, value] of Object.entries(jsonData.prm)) {
      const param = value as { real: number; imag: number };
      const target = mobiusParams[key as keyof typeof mobiusParams];
      if (target && typeof param.real === 'number' && typeof param.imag === 'number') {
        target.real = param.real;
        target.imag = param.imag;
      }
    }
    
    // GUI を更新
    gui.controllers.forEach(controller => controller.updateDisplay());
    
    // シェーダーのユニフォームを更新
    uniforms.a.value.set(mobiusParams.a.real, mobiusParams.a.imag);
    uniforms.b.value.set(mobiusParams.b.real, mobiusParams.b.imag);
    uniforms.c.value.set(mobiusParams.c.real, mobiusParams.c.imag);
    uniforms.d.value.set(mobiusParams.d.real, mobiusParams.d.imag);
    
    // 再描画
    render();
    
    console.log('JSON loaded successfully');
  } catch (err) {
    console.error('Failed to load JSON:', err);
    alert('JSONファイルの読み込みに失敗しました。');
  }
});

// JSON保存ボタンの処理
const saveJsonButton = document.getElementById('saveJsonButton') as HTMLButtonElement;

saveJsonButton.addEventListener('click', async () => {
  if (!jsonDirectory) {
    alert('JSONディレクトリを先に選択してください。');
    return;
  }

  const jsonData = {
    time: timeParams.time,
    prm: {
      a: { real: mobiusParams.a.real, imag: mobiusParams.a.imag },
      b: { real: mobiusParams.b.real, imag: mobiusParams.b.imag },
      c: { real: mobiusParams.c.real, imag: mobiusParams.c.imag },
      d: { real: mobiusParams.d.real, imag: mobiusParams.d.imag }
    }
  };

  try {
    const filename = `mobius_params_${Date.now()}.json`;
    const fileHandle = await jsonDirectory.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(jsonData, null, 2));
    await writable.close();
    console.log(`Saved to ${filename}`);
  } catch (err) {
    console.error('Failed to save JSON:', err);
    alert('JSONの保存に失敗しました。');
  }
});


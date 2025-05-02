import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import fragmentShader from './fragment.glsl'
import vertexShader from './vertex.glsl'


//const camera_position = new THREE.Vector3(-0.66, 1.24, 1.71);
const camera_position = new THREE.Vector3(6.86, 2.07, 8.26); 
const target          = new THREE.Vector3(3.8, -0.95, -1.21);

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.copy(camera_position);


const controls = new OrbitControls(camera, renderer.domElement);

function initOrbitControls(camera: THREE.Camera, renderer: THREE.WebGLRenderer) {

  controls.enableDamping = false;//true;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.8;
  controls.panSpeed = 0.3;
  controls.target.copy(target); // 注視点（Target）はuTargetと同期される
  controls.update();
}
controls.update(); // ← これが必要！

const scene = new THREE.Scene()
initOrbitControls(camera, renderer);

function updateCameraUniforms(material: THREE.ShaderMaterial, camera: THREE.Camera) {
  material.uniforms.uCameraPos.value.copy(camera.position);
  material.uniforms.uTarget.value.copy(controls.target);
}

const geometry = new THREE.PlaneGeometry(200, 200)
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  glslVersion: THREE.GLSL3,
  uniforms: {
    uAxis:       { value: false },
    uCameraPos:  { value: new THREE.Vector3() },  // すぐに指定するので空で初期化
    uTarget:     { value: new THREE.Vector3() },  // すぐに指定するので空で初期化
    uLowQuality: { value: false },
    uColor1:     { value: new THREE.Color().setRGB(0.2,0.4,0.6)},
    uColor2:     { value: new THREE.Color().setRGB(0.2,0.4,0.6)},    
    uFreq:       { value: 1.0 },
    uFogColor:   { value: new THREE.Color().setRGB(0.3, 0.9, 0.9)},
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  }
})
// 初回は値を設定
material.uniforms.uCameraPos.value.copy(camera.position);
material.uniforms.uTarget.value.copy(controls.target);
// イベントドリブンでカメラ情報をuniformに反映
controls.addEventListener('change', () => {
  camInput.set(camera.position);
  tgtInput.set(controls.target);
  material.uniforms.uCameraPos.value.copy(camera.position);
  material.uniforms.uTarget.value.copy(controls.target);
  renderer.render(scene, camera); // ← これで即時描画
});


const quad = new THREE.Mesh(geometry, material)
scene.add(quad)
/*
function animate(t: number) {
  material.uniforms.time.value = t * 0.001
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
requestAnimationFrame(animate)
*/

// 一度だけ描画。静止画ならこれで十分
function renderOnce() {
  renderer.render(scene, camera)
}

renderOnce();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  material.uniforms.resolution.value.set(window.innerWidth, window.innerHeight)
  renderOnce();
})

controls.addEventListener('start', () => {
  material.uniforms.uLowQuality.value = true;
  material.uniforms.uCameraPos.value.copy(camera.position);
  material.uniforms.uTarget.value.copy(controls.target);
  renderer.render(scene, camera);
});

controls.addEventListener('end', () => {
  material.uniforms.uLowQuality.value = false;
  material.uniforms.uCameraPos.value.copy(camera.position);
  material.uniforms.uTarget.value.copy(controls.target);
  
  renderer.render(scene, camera);
});

document.getElementById('save-button')?.addEventListener('click', saveRenderImage);



function showFeedback(success: boolean) {
  const status = document.getElementById('save-status');
  if (!status) return;

  status.textContent = success ? 'saved' : 'failed';
  status.classList.remove('visible');
  void status.offsetWidth; // Reflow を強制して再アニメーションを可能に
  status.classList.add('visible');
}

function flipImageDataVertically(imageData: ImageData): ImageData {
  const { width, height, data } = imageData;
  const flipped = new Uint8ClampedArray(data.length);
  const rowSize = width * 4;
  for (let y = 0; y < height; y++) {
    const srcRow = y * rowSize;
    const dstRow = (height - y - 1) * rowSize;
    flipped.set(data.slice(srcRow, srcRow + rowSize), dstRow);
  }
  return new ImageData(flipped, width, height);
}




function saveRenderImage() {
  try {
    const widthInput = document.getElementById('width-input') as HTMLInputElement;
    const heightInput = document.getElementById('height-input') as HTMLInputElement;
    const filenameInput = document.getElementById('filename-input') as HTMLInputElement;

    const width = parseInt(widthInput.value);
    const height = parseInt(heightInput.value);
    const filename = filenameInput.value || 'render';

    // 現在の uResolution の値を保存しておく
    const originalResolution = material.uniforms.uResolution.value.clone();

    // 保存用レンダーターゲットを作成
    const renderTarget = new THREE.WebGLRenderTarget(width, height);
    renderTarget.texture.encoding = renderer.outputEncoding;

    // 一時的に uResolution を保存サイズに
    material.uniforms.uResolution.value.set(width, height);

    // レンダリング先を renderTarget に切り替え
    renderer.setRenderTarget(renderTarget);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    // renderTarget の内容を canvas に描き出す
    const buffer = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(renderTarget, 0, 0, width, height, buffer);

    // ピクセルデータをImageDataとしてcanvasに出力
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');

    const imageData = ctx.createImageData(width, height);
    imageData.data.set(buffer);
    ctx.putImageData(flipImageDataVertically(imageData), 0, 0); // WebGLは上下反転なので修正

    // PNGとして保存
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();

    // 復元処理
    renderer.setRenderTarget(null);
    material.uniforms.uResolution.value.copy(originalResolution);
    renderer.setSize(originalResolution.x, originalResolution.y, false);
    camera.aspect = originalResolution.x / originalResolution.y;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    showFeedback(true);
  } catch (e) {
    showFeedback(false);
  }
}

function createVectorInputRow(labelText: string, onChange: (x: number, y: number, z: number) => void) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.marginBottom = '8px';

  const label = document.createElement('div');
  label.textContent = labelText;
  label.style.fontSize = '0.8em';
  label.style.marginBottom = '4px';
  container.appendChild(label);

  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.justifyContent = 'flex-end';
  row.style.gap = '4px';
  row.style.alignItems = 'center';
  container.appendChild(row);

  const allowance = document.createElement('span');
  //allowance.textContent = '';
  allowance.style.fontSize = '0.8em';
  allowance.style.marginRight = '6px';
  row.appendChild(allowance);

  const inputs = ['x', 'y', 'z'].map(() => {
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'ui-textfield';
    input.style.width = '40px';
    input.style.fontSize = '0.8em';
    input.style.textAlign = 'right';
    input.style.appearance = 'textfield'; // スピンボタン消す
    input.style.MozAppearance = 'textfield';
    input.style.WebkitAppearance = 'none';
    input.addEventListener('wheel', e => e.preventDefault()); // スクロールによる値変更も防止
    row.appendChild(input);
    return input;
  });

  container.addEventListener('change', () => {
    const values = inputs.map(i => parseFloat(i.value));
    if (values.every(v => !isNaN(v))) {
      onChange(values[0], values[1], values[2]);
    }
  });

  return {
    element: container,
    set: (v: THREE.Vector3) => {
      inputs[0].value = v.x.toFixed(2);
      inputs[1].value = v.y.toFixed(2);
      inputs[2].value = v.z.toFixed(2);
    }
  };
}





// GUI構築
const guiContainer = document.getElementById('glsl-controls')!;
const camInput = createVectorInputRow('camera position:', (x, y, z) => {
  camera.position.set(x, y, z);
  controls.update();
});
const tgtInput = createVectorInputRow('target:', (x, y, z) => {
  controls.target.set(x, y, z);
  controls.update();
});
camInput.set(camera.position);
tgtInput.set(controls.target);
guiContainer.appendChild(camInput.element);
guiContainer.appendChild(tgtInput.element);




// glsl-controlsの一番上に余白を作る
//   appendChild() ではなく insertBefore(..., container.firstChild) を使うことで、
//   スライダーなどパラメータUIの一番上に余白を確保できる
function topAllowanceToGlslControls(pixels = 20) {
  
  const container = document.getElementById('glsl-controls')
  if (!container) return

  const allowance = document.createElement('div')
  allowance.style.height = `${pixels}px`
  allowance.style.width = '100%'
  allowance.style.flexShrink = '0' // スクロール時に潰れないように
  container.insertBefore(allowance, container.firstChild)
}

function addToggleAxis(
  id: string,
  label: string,
  defaultValue: boolean,
  onChange: (val: boolean) => void
) {
  const container = document.getElementById('glsl-controls');
  if (!container) return;

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.gap = '6px';
  wrapper.style.width = '100%';
  wrapper.style.marginBottom = '6px';
  wrapper.style.fontSize = '0.9em';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.id = id;
  checkbox.checked = defaultValue;
  checkbox.style.marginRight = '4px';

  const checkboxLabel = document.createElement('label');
  checkboxLabel.textContent = label;
  checkboxLabel.htmlFor = id;
  checkboxLabel.style.cursor = 'pointer';

  wrapper.appendChild(checkbox);
  wrapper.appendChild(checkboxLabel);
  container.appendChild(wrapper);

  checkbox.addEventListener('change', () => {
    onChange(checkbox.checked);
  });

  onChange(checkbox.checked);
}

/*
function addSlider(
  id: string,
  label: string,
  min: number,
  max: number,
  step: number,
  defaultValue: number,
  onChange: (val: number) => void) {
  const container = document.getElementById('glsl-controls')
  if (!container) return

  const wrapper = document.createElement('div')
  wrapper.style.display = 'flex'
  wrapper.style.flexDirection = 'column'
  wrapper.style.gap = '4px'

  wrapper.innerHTML = `
    <label for="${id}">${label}</label>
    <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${defaultValue}"
           style="margin-left: 8px;">
  `
  container.appendChild(wrapper)
  const input = document.getElementById(id) as HTMLInputElement
  if (!input) {
    console.warn(`Slider input #${id} not found`)
    return
  }
  input.addEventListener('input', () => onChange(parseFloat(input.value)))
  onChange(defaultValue)
}
*/

function addSlider(
  id: string,
  label: string,
  min: number,
  max: number,
  step: number,
  defaultValue: number,
  onChange: (val: number) => void
) {
  const container = document.getElementById('glsl-controls');
  if (!container) return;

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.marginBottom = '10px';

  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.textContent = label;
  labelEl.style.fontSize = '0.9em';
  labelEl.style.marginBottom = '2px';

  const input = document.createElement('input');
  input.type = 'range';
  input.id = id;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(defaultValue);

  input.addEventListener('input', () => {
    onChange(parseFloat(input.value));
  });

  wrapper.appendChild(labelEl);
  wrapper.appendChild(input);
  container.appendChild(wrapper);

  onChange(defaultValue);
}



function addColorPicker(
  id: string,
  label: string,
  defaultValue: string,
  onChange: (color: THREE.Color) => void
) {
  const container = document.getElementById('glsl-controls')
  if (!container) return

  const wrapper = document.createElement('div')
  wrapper.style.display = 'flex'
  wrapper.style.flexDirection = 'column'
  wrapper.style.gap = '4px'

  wrapper.innerHTML = `
    <label for="${id}">${label}</label>
    <input id="${id}" type="color" value="${defaultValue}" style="margin-left: 8px;">
  `
  container.appendChild(wrapper)

  const input = document.getElementById(id) as HTMLInputElement
  if (!input) {
    console.warn(`Color input #${id} not found`)
    return
  }

  input.addEventListener('input', () => onChange(new THREE.Color(input.value)))
  onChange(new THREE.Color(defaultValue))
}

function addColorPickerH1(
  id: string,
  label: string,
  defaultValue: string,
  onChange: (color: THREE.Color) => void
) {
  const container = document.getElementById('glsl-controls')
  if (!container) return

  const wrapper = document.createElement('div')
  wrapper.style.display = 'flex'
  wrapper.style.flexDirection = 'row'
  wrapper.style.alignItems = 'center'
  wrapper.style.gap = '12px'

  const labelEl = document.createElement('label')
  labelEl.setAttribute('for', id)
  labelEl.textContent = label
  labelEl.style.marginRight = '6px'

  const input = document.createElement('input')
  input.id = id
  input.type = 'color'
  input.value = defaultValue

  input.addEventListener('input', () => onChange(new THREE.Color(input.value)))

  wrapper.appendChild(labelEl)
  wrapper.appendChild(input)
  container.appendChild(wrapper)

  onChange(new THREE.Color(defaultValue))
}

function addColorPickerH(
  id: string,
  label: string,
  defaultValue: string,
  onChange: (color: THREE.Color) => void
) {
  const container = document.getElementById('glsl-controls')
  if (!container) return

  const wrapper = document.createElement('div')
  wrapper.style.display = 'flex'
  wrapper.style.flexDirection = 'row'
  wrapper.style.alignItems = 'center'
  wrapper.style.justifyContent = 'space-between'
  wrapper.style.gap = '12px'
  wrapper.style.width = '100%'

  const labelEl = document.createElement('label')
  labelEl.setAttribute('for', id)
  labelEl.textContent = label

  const input = document.createElement('input')
  input.id = id
  input.type = 'color'
  input.value = defaultValue
  input.style.width = '40px'
  input.style.height = '30px'
  input.style.border = 'none'
  input.style.background = 'none'
  input.style.padding = '0'

  input.addEventListener('input', () => onChange(new THREE.Color(input.value)))

  const labelWrapper = document.createElement('div')
  labelWrapper.style.flex = '1'
  labelWrapper.style.textAlign = 'left'
  labelWrapper.appendChild(labelEl)

  const inputWrapper = document.createElement('div')
  inputWrapper.style.display = 'flex'
  inputWrapper.style.justifyContent = 'flex-end'
  inputWrapper.style.flex = '1'
  inputWrapper.appendChild(input)

  wrapper.appendChild(labelWrapper)
  wrapper.appendChild(inputWrapper)
  container.appendChild(wrapper)

  onChange(new THREE.Color(defaultValue))
}



// main.ts の最初のパラメータ追加直前に必ず呼ぶ
if (typeof window.setParamPanelVisible === 'function') {
  window.setParamPanelVisible(true)
}

topAllowanceToGlslControls()


addToggleAxis('toggle-axis', 'Show Axis', false, (val: boolean) => {
  material.uniforms.uAxis.value = val;
  renderer.render(scene, camera)
});

addSlider('freq-slider', 'Frequency', 0, 10, 0.1, 1.0, (v) => {
  material.uniforms.uFreq.value = v
  //renderer.render(scene, camera)  
})

addColorPickerH('fog-color', 'Fog Color', '#222222', (color) => {
  material.uniforms.uFogColor.value.copy(color)
})


addColorPickerH('color-picker1', 'Color #1', '#448844', (color) => {
  material.uniforms.uColor1.value.copy(color)
})

addColorPickerH('color-picker2', 'Color #2', '#ff8800', (color) => {
  material.uniforms.uColor2.value.copy(color)
})


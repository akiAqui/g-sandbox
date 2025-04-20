import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import fragmentShader from './fragment.glsl'
import vertexShader from './vertex.glsl'

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(2.0, 1.5, 3.0); // ro


const controls = new OrbitControls(camera, renderer.domElement);

function initOrbitControls(camera: THREE.Camera, renderer: THREE.WebGLRenderer) {

  controls.enableDamping = false;//true;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.8;
  controls.panSpeed = 0.3;
  controls.target.set(0, 0, 0); // 注視点（Target）はuTargetと同期される
  controls.update();
}
controls.update(); // ← これが必要！

// イベントドリブンでカメラ情報をuniformに反映
controls.addEventListener('change', () => {
  material.uniforms.uCameraPos.value.copy(camera.position);
  material.uniforms.uTarget.value.copy(controls.target);
  renderer.render(scene, camera); // ← これで即時描画
});



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
    uTime:       { value: 0.0 },
    uCameraPos:  { value: new THREE.Vector3(2.0, 1.5, 3.0) },
    uTarget:     { value: new THREE.Vector3(0.0, 0.0, 0.0) },
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
  material.uniforms.uTime.value = 0.0  // 必要なら任意の値
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



function addSlider(
  id: string,
  label: string,
  min: number,
  max: number,
  step: number,
  defaultValue: number,
  onChange: (val: number) => void
) {
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



addColorPickerH('fog-color', 'Fog Color', '#222222', (color) => {
  material.uniforms.uFogColor.value.copy(color)
})


addColorPickerH('color-picker1', 'Color #1', '#448844', (color) => {
  console.log('color1 changed', color)
  material.uniforms.uColor1.value.copy(color)
})
addSlider('freq-slider', 'Frequency', 0, 10, 0.1, 1.0, (v) => {
  console.log('slider changed', v)  
  material.uniforms.uFreq.value = v
})

addColorPickerH('color-picker2', 'Color #2', '#ff8800', (color) => {
  material.uniforms.uColor2.value.copy(color)
})


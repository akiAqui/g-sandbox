import * as THREE from 'three'
//import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import fragmentShader from './fragment.glsl'
import vertexShader from './vertex.glsl'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.z = 90

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

//const controls = new OrbitControls(camera, renderer.domElement)

const geometry = new THREE.PlaneGeometry(200, 200)
const material = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  glslVersion: THREE.GLSL3,
  uniforms: {
    time: { value: 0.0 },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  }
})

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
  material.uniforms.time.value = 0.0  // 必要なら任意の値
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


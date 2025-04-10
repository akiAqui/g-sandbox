import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import fragmentShader from './fragment.glsl?raw'
import vertexShader from './vertex.glsl?raw'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.z =90;

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)

const geometry = new THREE.PlaneGeometry(200, 200)
const material = new THREE.ShaderMaterial({
  fragmentShader,
  vertexShader,
  uniforms: {
    iTime: { value: 0.0 },
    iResolution: { value: new THREE.Vector3(window.innerWidth, window.innerHeight, 1) }
  }
})
const quad = new THREE.Mesh(geometry, material)
scene.add(quad)

function animate(time: number) {
  material.uniforms.iTime.value = time * 0.001
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
requestAnimationFrame(animate)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight, 1)
})


import * as THREE from 'three';
import renderVert from './vertex.glsl';
import simFragment from './sim.glsl';
import renderFrag from './fragment.glsl';
const size = 128;
const boidCount = size * size;
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2');
const renderer = new THREE.WebGLRenderer({ canvas, context: gl });
document.body.appendChild(renderer.domElement);
console.log('WebGL2:', renderer.capabilities.isWebGL2);
console.log('OES_texture_float:', renderer.extensions.get('OES_texture_float'));
renderer.setSize(window.innerWidth, window.innerHeight);
const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const simScene = new THREE.Scene();
const renderScene = new THREE.Scene();
const rtOptions = {
  type: THREE.FloatType,
  format: THREE.RGBAFormat,
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  depthBuffer: false,
  stencilBuffer: false,
};
const rtA = new THREE.WebGLRenderTarget(size, size, rtOptions);
const rtB = new THREE.WebGLRenderTarget(size, size, rtOptions);
let currentRT = rtA;
let nextRT = rtB;
const initData = new Float32Array(size * size * 4);
for (let i = 0; i < size * size; i++) {
  initData[i * 4 + 0] = Math.random() * 2.0 - 1.0;   // pos.x
  initData[i * 4 + 1] = Math.random() * 2.0 - 1.0;   // pos.y
  initData[i * 4 + 2] = Math.random() * 0.2 - 0.1;   // vel.x
  initData[i * 4 + 3] = Math.random() * 0.2 - 0.1;   // vel.y
}
const tex = new THREE.DataTexture(initData, size, size, THREE.RGBAFormat, THREE.FloatType);
tex.needsUpdate = true;
const simMat = new THREE.ShaderMaterial({
  uniforms: {
    uTex: { value: tex },
    uResolution: { value: new THREE.Vector2(size, size) },
  },
  fragmentShader: simFragment,
});
const simPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMat);
simScene.add(simPlane);
const positions = new Float32Array(boidCount * 3);
for (let i = 0; i < boidCount; i++) {
  const x = ((i % size) + 0.5) / size;
  const y = (Math.floor(i / size) + 0.5) / size;
  positions[i * 3 + 0] = x;
  positions[i * 3 + 1] = y;
  positions[i * 3 + 2] = 0;
}
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setDrawRange(0, boidCount);
const renderMat = new THREE.ShaderMaterial({
  vertexShader: renderVert,
  fragmentShader: renderFrag,
  uniforms: {
    uTex: { value: currentRT.texture },
    uResolution: { value: new THREE.Vector2(size, size) },
  },
  transparent: true
});
const mesh = new THREE.Points(geometry, renderMat);
renderScene.add(mesh);
// 初期データを currentRT に書き込む
simMat.uniforms.uTex.value = tex;
renderer.setRenderTarget(currentRT);
renderer.render(simScene, orthoCam);
renderer.setRenderTarget(null);
animate(); // 初期化後にアニメーション開始
function animate() {
  requestAnimationFrame(animate);
  simMat.uniforms.uTex.value = currentRT.texture;
  renderer.setRenderTarget(nextRT);
  renderer.render(simScene, orthoCam);
  renderer.setRenderTarget(null);
  renderMat.uniforms.uTex.value = nextRT.texture;
  renderer.render(renderScene, orthoCam);
  [currentRT, nextRT] = [nextRT, currentRT];
}

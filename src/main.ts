import * as THREE from 'three';
import simFragment from './sim.glsl';
import renderVert from './vertex.glsl';
import renderFrag from './fragment.glsl';
const size = 128;
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer();
document.body.appendChild(renderer.domElement);
renderer.setSize(size, size);
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
  initData[i * 4 + 0] = Math.random() * 2.0 - 1.0; // pos.x
  initData[i * 4 + 1] = Math.random() * 2.0 - 1.0; // pos.y
  initData[i * 4 + 2] = Math.random() * 0.1 - 0.05; // vel.x
  initData[i * 4 + 3] = Math.random() * 0.1 - 0.05; // vel.y
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
const simScene = new THREE.Scene();
simScene.add(simPlane);
const renderMat = new THREE.ShaderMaterial({
  vertexShader: renderVert,
  fragmentShader: renderFrag,
  uniforms: {
    uTex: { value: currentRT.texture },
    uResolution: { value: new THREE.Vector2(size, size) },
  },
});
const mesh = new THREE.Points(new THREE.PlaneGeometry(2, 2, size - 1, size - 1), renderMat);
scene.add(mesh);
function animate() {
  requestAnimationFrame(animate);
  simMat.uniforms.uTex.value = currentRT.texture;
  renderer.setRenderTarget(nextRT);
  renderer.render(simScene, camera);
  renderer.setRenderTarget(null);
  renderMat.uniforms.uTex.value = nextRT.texture;
  renderer.render(scene, camera);
  [currentRT, nextRT] = [nextRT, currentRT];
}
animate();

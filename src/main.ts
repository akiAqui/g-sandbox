import * as THREE from 'three';
import fragmentShader from './fragment.glsl'
import vertexShader from './vertex.glsl'

// シーン、カメラ、レンダラーの作成
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.z = 1;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// フルスクリーンクワッド用のジオメトリとマテリアル
const geometry = new THREE.PlaneGeometry(2, 2);

const uniforms = {
  time: { value: 0.0 },
  resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  mouse: { value: new THREE.Vector2(0.0, 0.0) }
};


const material = new THREE.ShaderMaterial({
  uniforms: uniforms,
  fragmentShader,
  vertexShader,
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

if (import.meta.hot) {
  import.meta.hot.accept(['./fragment.glsl', './vertex.glsl'], (modules) => {
    console.log('GLSLファイルが変更された');
    if (modules) {
      material.fragmentShader = modules[0].default;
      material.needsUpdate = true;
    }
  });
}

// レンダリングループ
function animate() {
  material.uniforms.time.value = performance.now() * 0.01;

  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();


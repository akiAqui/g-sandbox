import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { GUI } from 'dat.gui';

// シェーダーのインポート
import vertexShader from '/src/shaders/vertex.glsl';
import fragmentShader from '/src/shaders/fragment.glsl';
import chromaticAberrationFragmentShader from '/src/shaders/chromaticAberration.glsl';
import chromaticAberrationVertexShader from '/src/shaders/chromaticAberrationVertex.glsl';

class FluidArtSimulation {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private clock: THREE.Clock;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private chromaticAberrationPass: ShaderPass;
  private lastMousePosition: { x: number, y: number } = { x: 0, y: 0 };
  private mousePosition: { x: number, y: number } = { x: 0, y: 0 };
  private mouseVelocity: { x: number, y: number } = { x: 0, y: 0 };
  private gui: GUI;
  private params = {
    bloomEnabled: true,
    chromaticAberrationEnabled: true,
    bloomStrength: 1.5,
    bloomRadius: 0.4,
    bloomThreshold: 0.2,
    chromaticAberrationStrength: 0.5,
    noiseScale: 1.5,
    noiseIntensity: 0.5,
    fluidIntensity: 0.8,
    colorIntensity: 1.2,
    colorA: '#3a0ca3', // 深い青/紫
    colorB: '#f72585', // マゼンタ/ピンク
    colorC: '#4cc9f0', // 水色/シアン
    colorD: '#ffd166', // 黄色/金
  };

  constructor() {
    // シーンのセットアップ
    this.scene = new THREE.Scene();
    
    // カメラのセットアップ
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 1;
    
    // レンダラーのセットアップ
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(this.renderer.domElement);
    
    // コントロールのセットアップ
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    
    // 時間管理用のクロック
    this.clock = new THREE.Clock();
    
    // ジオメトリとマテリアルの作成
    this.createMeshWithShaders();
    
    // ポストプロセッシングの設定
    this.setupPostProcessing();
    
    // GUI設定
    this.setupGUI();
    
    // リサイズイベントのリスナー
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // マウスイベントのリスナー
    window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    
    // アニメーションループの開始
    this.animate();
  }

  private createMeshWithShaders(): void {
    this.geometry = new THREE.PlaneGeometry(2, 2, 128, 128);
    
    // シェーダーマテリアルの作成
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uMouseVelocity: { value: new THREE.Vector2(0, 0) },
        uColorA: { value: new THREE.Color(this.params.colorA) },
        uColorB: { value: new THREE.Color(this.params.colorB) },
        uColorC: { value: new THREE.Color(this.params.colorC) },
        uColorD: { value: new THREE.Color(this.params.colorD) },
        uNoiseScale: { value: this.params.noiseScale },
        uNoiseIntensity: { value: this.params.noiseIntensity },
        uFluidIntensity: { value: this.params.fluidIntensity },
        uColorIntensity: { value: this.params.colorIntensity },
      }
    });
    
    // メッシュの作成とシーンへの追加
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  private setupPostProcessing(): void {
    // レンダーターゲットの作成
    const renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth, 
      window.innerHeight, 
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        encoding: THREE.sRGBEncoding
      }
    );
    
    // エフェクトコンポーザーの作成
    this.composer = new EffectComposer(this.renderer, renderTarget);
    
    // レンダーパスの追加
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    // ブルームエフェクトの追加
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      this.params.bloomStrength,
      this.params.bloomRadius,
      this.params.bloomThreshold
    );
    this.composer.addPass(this.bloomPass);
    
    // 色収差エフェクトの追加
    this.chromaticAberrationPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uStrength: { value: this.params.chromaticAberrationStrength },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader: chromaticAberrationVertexShader,
      fragmentShader: chromaticAberrationFragmentShader
    });
    this.composer.addPass(this.chromaticAberrationPass);
  }

  private setupGUI(): void {
    this.gui = new GUI();
    
    // エフェクト設定フォルダ
    const effectsFolder = this.gui.addFolder('ポストエフェクト');
    
    // ブルームエフェクト設定
    effectsFolder.add(this.params, 'bloomEnabled').name('ブルーム効果').onChange(() => {
      this.bloomPass.enabled = this.params.bloomEnabled;
    });
    
    effectsFolder.add(this.params, 'bloomStrength', 0, 3, 0.01).name('ブルーム強度').onChange((value) => {
      this.bloomPass.strength = value;
    });
    
    effectsFolder.add(this.params, 'bloomRadius', 0, 1, 0.01).name('ブルーム半径').onChange((value) => {
      this.bloomPass.radius = value;
    });
    
    effectsFolder.add(this.params, 'bloomThreshold', 0, 1, 0.01).name('ブルーム閾値').onChange((value) => {
      this.bloomPass.threshold = value;
    });
    
    // 色収差エフェクト設定
    effectsFolder.add(this.params, 'chromaticAberrationEnabled').name('色収差効果').onChange(() => {
      this.chromaticAberrationPass.enabled = this.params.chromaticAberrationEnabled;
    });
    
    effectsFolder.add(this.params, 'chromaticAberrationStrength', 0, 2, 0.01).name('色収差強度').onChange((value) => {
      this.chromaticAberrationPass.uniforms.uStrength.value = value;
    });
    
    effectsFolder.open();
    
    // シェーダーパラメータフォルダ
    const shaderFolder = this.gui.addFolder('シェーダーパラメータ');
    
    shaderFolder.add(this.params, 'noiseScale', 0.1, 5, 0.1).name('ノイズスケール').onChange((value) => {
      this.material.uniforms.uNoiseScale.value = value;
    });
    
    shaderFolder.add(this.params, 'noiseIntensity', 0, 2, 0.1).name('ノイズ強度').onChange((value) => {
      this.material.uniforms.uNoiseIntensity.value = value;
    });
    
    shaderFolder.add(this.params, 'fluidIntensity', 0, 2, 0.1).name('流体強度').onChange((value) => {
      this.material.uniforms.uFluidIntensity.value = value;
    });
    
    shaderFolder.add(this.params, 'colorIntensity', 0, 3, 0.1).name('色彩強度').onChange((value) => {
      this.material.uniforms.uColorIntensity.value = value;
    });
    
    shaderFolder.open();
    
    // カラーパレットフォルダ
    const colorFolder = this.gui.addFolder('カラーパレット');
    
    colorFolder.addColor(this.params, 'colorA').name('色 A').onChange((value) => {
      this.material.uniforms.uColorA.value.set(value);
    });
    
    colorFolder.addColor(this.params, 'colorB').name('色 B').onChange((value) => {
      this.material.uniforms.uColorB.value.set(value);
    });
    
    colorFolder.addColor(this.params, 'colorC').name('色 C').onChange((value) => {
      this.material.uniforms.uColorC.value.set(value);
    });
    
    colorFolder.addColor(this.params, 'colorD').name('色 D').onChange((value) => {
      this.material.uniforms.uColorD.value.set(value);
    });
    
    colorFolder.open();
  }

  private handleResize(): void {
    // ウィンドウサイズ変更時の処理
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    
    if (this.material.uniforms.uResolution) {
      this.material.uniforms.uResolution.value.set(width, height);
    }
    
    if (this.chromaticAberrationPass.uniforms.uResolution) {
      this.chromaticAberrationPass.uniforms.uResolution.value.set(width, height);
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    // 前回のマウス位置を保存
    this.lastMousePosition.x = this.mousePosition.x;
    this.lastMousePosition.y = this.mousePosition.y;
    
    // 現在のマウス位置を更新（-1 ~ 1の範囲に正規化）
    this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // マウスの速度を計算
    this.mouseVelocity.x = this.mousePosition.x - this.lastMousePosition.x;
    this.mouseVelocity.y = this.mousePosition.y - this.lastMousePosition.y;
    
    // uniforms に値を設定
    this.material.uniforms.uMouse.value.set(this.mousePosition.x, this.mousePosition.y);
    this.material.uniforms.uMouseVelocity.value.set(this.mouseVelocity.x, this.mouseVelocity.y);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    
    // 時間の更新
    const elapsedTime = this.clock.getElapsedTime();
    this.material.uniforms.uTime.value = elapsedTime;
    
    // コントロールの更新
    this.controls.update();
    
    // エフェクトコンポーザーでレンダリング
    this.composer.render();
  }
}

// アプリケーションの開始
window.addEventListener('DOMContentLoaded', () => {
  new FluidArtSimulation();
});

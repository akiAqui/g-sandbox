import * as THREE from 'three';
import { effectConfigs, type EffectConfig } from './shaderParameters';
import { TextureGenerator } from './textureGenerator';
import vertexShader from './vertex.glsl';

// シェーダーのインポート
import spiralZoomShader from './spiral_zoom.glsl';
import twirlShader from './twirl.glsl';
import pinchPunchShader from './pinch_punch.glsl';
import nestedSineCosineShader from './nested_sine_cosine.glsl';
import rippleWaveShader from './ripple_wave.glsl';
import polarSwirlShader from './polar_swirl.glsl';
import zoomingSwirlShader from './zooming_swirl.glsl';
import sinusoidalWarpShader from './sinusoidal_warp.glsl';
import spiralVortexShader from './spiral_vortex.glsl';
import doubleSpiralZoomShader from './double_spiral_zoom.glsl';

class ShaderApp {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private clock: THREE.Clock;
  private currentEffect: string;
  private isAnimationEnabled: boolean = true;
  private timeScale: number = 1.0;
  private currentTextureType: string = TextureGenerator.TextureType.GRID;
  
  constructor() {
    // Three.jsの初期設定
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.clock = new THREE.Clock();
    
    // レンダラーの設定
    this.renderer.setSize(window.innerWidth - 300, window.innerHeight);  // コントロールパネルの幅を考慮
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('canvas-container')?.appendChild(this.renderer.domElement);
    
    // カメラの位置設定
    this.camera.position.z = 1;
    
    // 初期テクスチャとエフェクトの設定
    this.currentEffect = effectConfigs[0].name;
    this.setupMaterial();
    this.setupGeometry();
    this.setupGUI();
    this.setupEventListeners();
    
    // アニメーションの開始
    this.animate();
  }
  
  private setupMaterial(): void {
    const texture = TextureGenerator.createTexture(this.currentTextureType as TextureType);
    
    // 共通のuniforms
    const uniforms = {
      uTime: { value: 0 },
      uRateOfTime: { value:1.0 },
      uTexture: { value: texture },
      uResolution: { value: new THREE.Vector2(window.innerWidth - 300, window.innerHeight) }
    };
    
    // 現在のエフェクトのパラメータをuniformsに追加
    const effect = effectConfigs.find(e => e.name === this.currentEffect);
    if (effect) {
      Object.entries(effect.parameters).forEach(([name, config]) => {
        const uniformName = `u${name.charAt(0).toUpperCase()}${name.slice(1)}`;
        uniforms[uniformName] = { value: config.value };
      });
    }
    
    // シェーダーマテリアルの作成
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: this.loadShader(this.currentEffect),
      uniforms: uniforms
    });
  }
  
  private setupGeometry(): void {
    this.geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }
  
  private loadShader(effectName: string): string {
    const shaders: Record<string, string> = {
      'spiral_zoom': spiralZoomShader,
      'twirl': twirlShader,
      'pinch_punch': pinchPunchShader,
      'nested_sine_cosine': nestedSineCosineShader,
      'ripple_wave': rippleWaveShader,
      'polar_swirl': polarSwirlShader,
      'zooming_swirl': zoomingSwirlShader,
      'sinusoidal_warp': sinusoidalWarpShader,
      'spiral_vortex': spiralVortexShader,
      'double_spiral_zoom': doubleSpiralZoomShader
    };
    
    return shaders[effectName] || spiralZoomShader;
  }
  
  private setupGUI(): void {
    // エフェクトタブの生成
    const tabContainer = document.getElementById('effect-tabs');
    if (tabContainer) {
      effectConfigs.forEach(effect => {
        const button = document.createElement('button');
        button.className = 'tab-button';
        button.textContent = effect.label;
        button.dataset.effect = effect.name;
        if (effect.name === this.currentEffect) {
          button.classList.add('active');
        }
        tabContainer.appendChild(button);
      });
    }
    
    // パラメータグループの生成
    const parameterContainers = document.getElementById('parameter-containers');
    if (parameterContainers) {
      effectConfigs.forEach(effect => {
        const group = document.createElement('div');
        group.className = `parameter-group ${effect.name === this.currentEffect ? 'active' : ''}`;
        group.dataset.effect = effect.name;
        
        Object.entries(effect.parameters).forEach(([name, config]) => {
          const param = document.createElement('div');
          param.className = 'parameter';
          
          const label = document.createElement('label');
          label.textContent = config.label || name;
          
          const input = document.createElement('input');
          input.type = 'range';
          input.min = config.min.toString();
          input.max = config.max.toString();
          input.step = config.step.toString();
          input.value = config.value.toString();
          input.dataset.param = name;
          
          const value = document.createElement('span');
          value.className = 'value-display';
          value.textContent = config.value.toString();
          
          param.appendChild(label);
          param.appendChild(input);
          param.appendChild(value);
          group.appendChild(param);
        });
        
        parameterContainers.appendChild(group);
      });
    }
    
    // テクスチャ選択の設定
    const textureSelect = document.getElementById('texture-select') as HTMLSelectElement;
    if (textureSelect) {
      textureSelect.value = this.currentTextureType;
    }
    
    // アニメーション制御の設定
    const timeScaleInput = document.getElementById('time-scale') as HTMLInputElement;
    const animationCheckbox = document.getElementById('animation-enabled') as HTMLInputElement;
    if (timeScaleInput && animationCheckbox) {
      timeScaleInput.value = this.timeScale.toString();
      animationCheckbox.checked = this.isAnimationEnabled;
    }
  }
  
  private setupEventListeners(): void {
    // エフェクト切り替え
    document.getElementById('effect-tabs')?.addEventListener('click', (e) => {
      const button = (e.target as HTMLElement).closest('.tab-button');
      if (button && button.dataset.effect) {
        this.changeEffect(button.dataset.effect);
      }
    });
    
    // パラメータ変更
    document.getElementById('parameter-containers')?.addEventListener('input', (e) => {
      const input = e.target as HTMLInputElement;
      if (input.dataset.param) {
        this.updateParameter(input.dataset.param, parseFloat(input.value));
        // 値表示の更新
        const display = input.nextElementSibling as HTMLElement;
        if (display) {
          display.textContent = input.value;
        }
      }
    });
    
    // テクスチャ変更
    document.getElementById('texture-select')?.addEventListener('change', (e) => {
      const select = e.target as HTMLSelectElement;
      this.changeTexture(select.value as TextureType);
    });
    
    // 時間制御
    document.getElementById('time-scale')?.addEventListener('input', (e) => {
      const input = e.target as HTMLInputElement;
      this.timeScale = parseFloat(input.value);
      const display = input.nextElementSibling as HTMLElement;
      if (display) {
        display.textContent = input.value;
      }
    });
    
    document.getElementById('animation-enabled')?.addEventListener('change', (e) => {
      const checkbox = e.target as HTMLInputElement;
      this.isAnimationEnabled = checkbox.checked;
    });
    
    // ウィンドウリサイズ
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
  
  private changeEffect(effectName: string): void {
    this.currentEffect = effectName;
    
    // タブの更新
    document.querySelectorAll('.tab-button').forEach(button => {
      button.classList.toggle('active', (button as HTMLElement).dataset.effect === effectName);
    });
    
    // パラメータグループの更新
    document.querySelectorAll('.parameter-group').forEach(group => {
      group.classList.toggle('active', (group as HTMLElement).dataset.effect === effectName);
    });
    
    // シェーダーの更新
    this.material.fragmentShader = this.loadShader(effectName);
    this.material.needsUpdate = true;
    
    // uniformsの更新
    const effect = effectConfigs.find(e => e.name === effectName);
    if (effect) {
      Object.entries(effect.parameters).forEach(([name, config]) => {
        const uniformName = `u${name.charAt(0).toUpperCase()}${name.slice(1)}`;
        if (!this.material.uniforms[uniformName]) {
          this.material.uniforms[uniformName] = { value: config.value };
        }
      });
    }
  }
  
  private updateParameter(paramName: string, value: number): void {
    const uniformName = `u${paramName.charAt(0).toUpperCase()}${paramName.slice(1)}`;
    if (this.material.uniforms[uniformName]) {
      this.material.uniforms[uniformName].value = value;
    }
  }
  
  private changeTexture(type: TextureType): void {
    this.currentTextureType = type;
    const texture = TextureGenerator.createTexture(type);
    this.material.uniforms.uTexture.value = texture;
  }
  
  private onWindowResize(): void {
    const width = window.innerWidth - 300;  // コントロールパネルの幅を考慮
    const height = window.innerHeight;
    
    this.renderer.setSize(width, height);
    this.camera.updateProjectionMatrix();
    
    if (this.material.uniforms.uResolution) {
      this.material.uniforms.uResolution.value.set(width, height);
    }
  }
  
  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    if (this.isAnimationEnabled) {
      const time = this.clock.getElapsedTime() * this.timeScale;
      this.material.uniforms.uTime.value = time;
    }
    this.renderer.render(this.scene, this.camera);
  }
}

// アプリケーションの起動
new ShaderApp();

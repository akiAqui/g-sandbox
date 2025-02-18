import * as THREE from 'three';
import { GUI } from 'lil-gui';
import { effectConfigs } from './effectConfigs';
import vertexShader from './vertex.glsl';

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
    private gui: GUI;
    private clock: THREE.Clock;
    private currentEffect: string;

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
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.body.appendChild(this.renderer.domElement);

        // カメラの位置設定
        this.camera.position.z = 1;

        // テクスチャの生成
        const texture = this.createGridTexture();

        // 初期エフェクトの設定
        this.currentEffect = effectConfigs[0].name;

        // 共通のuniforms
        const uniforms = {
            uTime: { value: 0 },
            uTexture: { value: texture },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
        };

        // シェーダーマテリアルの作成
        this.material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: this.loadShader(this.currentEffect),
            uniforms: uniforms
        });

        // 初期エフェクトのパラメータをuniformsに追加
        this.initializeEffectUniforms(this.currentEffect);

        // ジオメトリとメッシュの作成
        this.geometry = new THREE.PlaneGeometry(2, 2);
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);

        // GUIの設定
        this.setupGUI();

        // イベントリスナーの設定
        window.addEventListener('resize', this.onWindowResize.bind(this));
        this.onWindowResize();

        // アニメーションの開始
        this.animate();
    }

    private createGridTexture(): THREE.Texture {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        // 白背景
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);

        // 水色のグリッド
        ctx.strokeStyle = 'lightblue';
        ctx.lineWidth = 1;
        const gridSize = 32;

        for (let i = 0; i <= size; i += gridSize) {
            // 縦線
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, size);
            ctx.stroke();

            // 横線
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(size, i);
            ctx.stroke();
        }

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    private loadShader(effectName: string): string {
        const effect = effectConfigs.find(e => e.name === effectName);
        if (!effect) throw new Error(`Effect ${effectName} not found`);

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

        const shader = shaders[effect.shader];
        if (!shader) {
            console.error(`Shader not found for effect: ${effectName}`);
            return spiralZoomShader; // フォールバック
        }
        return shader;
    }

    private initializeEffectUniforms(effectName: string): void {
        const effect = effectConfigs.find(e => e.name === effectName);
        if (!effect) return;

        // エフェクトのパラメータをuniformsに追加
        Object.entries(effect.parameters).forEach(([name, config]) => {
            const uniformName = `u${name.charAt(0).toUpperCase()}${name.slice(1)}`;
            this.material.uniforms[uniformName] = { value: config.value };
        });
    }

    private setupGUI(): void {
        this.gui = new GUI();

        // エフェクト選択
        const effectNames = effectConfigs.map(e => e.name);
        this.gui.add({ effect: this.currentEffect }, 'effect', effectNames)
            .name('Effect')
            .onChange(this.changeEffect.bind(this));

        // 初期エフェクトのパラメータ設定
        this.updateGUIParameters();
    }

    private updateGUIParameters(): void {
        // 既存のフォルダを削除
        while (this.gui.folders.length > 0) {
            this.gui.removeFolder(this.gui.folders[0]);
        }

        // 現在のエフェクトのパラメータを設定
        const effect = effectConfigs.find(e => e.name === this.currentEffect);
        if (!effect) return;

        const paramFolder = this.gui.addFolder('Parameters');
        Object.entries(effect.parameters).forEach(([name, config]) => {
            const uniformName = `u${name.charAt(0).toUpperCase()}${name.slice(1)}`;
            paramFolder.add(
                this.material.uniforms[uniformName],
                'value',
                config.min,
                config.max,
                config.step
            ).name(name);
        });
    }

    private changeEffect(effectName: string): void {
        console.log('Changing effect to:', effectName);
        this.currentEffect = effectName;
        
        // シェーダーの読み込みと設定
        const shader = this.loadShader(effectName);
        console.log('Shader loaded:', !!shader);
        
        // 新しいエフェクトのuniformsを初期化
        this.initializeEffectUniforms(effectName);
        
        // シェーダーの更新
        this.material.fragmentShader = shader;
        this.material.needsUpdate = true;
        
        // GUIの更新
        this.updateGUIParameters();
    }

    private onWindowResize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.renderer.setSize(width, height);
        this.camera.updateProjectionMatrix();
        
        if (this.material.uniforms.uResolution) {
            this.material.uniforms.uResolution.value.set(width, height);
        }
    }

    private animate(): void {
        requestAnimationFrame(this.animate.bind(this));
        const time = this.clock.getElapsedTime();
        this.material.uniforms.uTime.value = time;
        this.renderer.render(this.scene, this.camera);
    }
}

// アプリケーションの起動
new ShaderApp();

// src/main.ts

import * as THREE from 'three';
import { GUI } from 'lil-gui';
import { effectConfigs } from './effectConfigs';
import vertexShader from 'vertex.glsl';

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
        // 基本的なThree.jsのセットアップ
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.clock = new THREE.Clock();
        
        // レンダラーの設定
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.body.appendChild(this.renderer.domElement);

        // カメラの位置設定
        this.camera.position.z = 1;

        // プロシージャルテクスチャの生成
        const texture = this.createGridTexture();

        // 初期エフェクトの設定
        this.currentEffect = effectConfigs[0].name;
        
        // シェーダーマテリアルの作成
        this.material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: this.loadShader(this.currentEffect),
            uniforms: {
                uTime: { value: 0 },
                uTexture: { value: texture },
                uResolution: { value: new THREE.Vector2() }
            }
        });

        // ジオメトリとメッシュの作成
        this.geometry = new THREE.PlaneGeometry(2, 2);
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);

        // GUIの設定
        this.setupGUI();

        // イベントリスナーの設定
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
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
        ctx.lineWidth = 2;
        const gridSize = 32;

        for (let i = 0; i <= size; i += gridSize) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, size);
            ctx.stroke();

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
        return require(`./shaders/effects/${effect.shader}.glsl`);
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
        // 既存のパラメータフォルダを削除
        const folders = Array.from(this.gui.folders);
        folders.forEach(folder => this.gui.removeFolder(folder));

        // 現在のエフェクトのパラメータを設定
        const effect = effectConfigs.find(e => e.name === this.currentEffect);
        if (!effect) return;

        const paramFolder = this.gui.addFolder('Parameters');
        Object.entries(effect.parameters).forEach(([name, config]) => {
            const uniformName = `u${name.charAt(0).toUpperCase()}${name.slice(1)}`;
            paramFolder.add(
                this.material.uniforms[uniformName] || { value: config.value },
                'value',
                config.min,
                config.max,
                config.step
            ).name(name);
        });
    }

    private changeEffect(effectName: string): void {
        this.currentEffect = effectName;
        const shader = this.loadShader(effectName);
        this.material.fragmentShader = shader;
        this.material.needsUpdate = true;
        this.updateGUIParameters();
    }

    private onWindowResize(): void {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    }

    private animate(): void {
        requestAnimationFrame(this.animate.bind(this));
        this.material.uniforms.uTime.value = this.clock.getElapsedTime();
        this.renderer.render(this.scene, this.camera);
    }
}

// アプリケーションの起動
new ShaderApp();

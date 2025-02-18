import * as THREE from 'three';

// クラス外で型定義
export type TextureType = (typeof TextureGenerator.TextureType)[keyof typeof TextureGenerator.TextureType];

export class TextureGenerator {
    /**
     * テクスチャの種類を定義
     * 今後の拡張性を考慮して、TypeScriptの型として定義
     */
    static readonly TextureType = {
        GRID: 'grid',
        CONCENTRIC: 'concentric'
    } as const;

    /**
     * グリッドテクスチャを生成
     * - 白背景に水色のグリッド
     * - サイズは512x512
     * - グリッドの間隔は32px
     */
    static createGridTexture(): THREE.Texture {
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

    /**
     * 同心円テクスチャを生成
     * - 中心が赤で外側に向かって青にグラデーション
     * - サイズは512x512
     * - 円の数は20個
     */
    static createConcentricTexture(): THREE.Texture {
        const size = 512;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        const centerX = size / 2;
        const centerY = size / 2;
        const maxRadius = Math.sqrt(2) * size / 2;  // 対角線の長さの半分
        const circles = 20;  // 円の数

        // 背景を白で塗りつぶし
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, size, size);

        // 同心円を描画
        for (let i = circles; i >= 0; i--) {
            const radius = (i / circles) * maxRadius;
            const ratio = i / circles;  // 0から1の値

            // 赤から青へのグラデーション
            const red = Math.floor(255 * (1 - ratio));
            const blue = Math.floor(255 * ratio);
            ctx.fillStyle = `rgb(${red}, 0, ${blue})`;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * テクスチャタイプに基づいて適切なテクスチャを生成
     */
    static createTexture(type: TextureType): THREE.Texture {
        switch (type) {
            case TextureGenerator.TextureType.GRID:
                return this.createGridTexture();
            case TextureGenerator.TextureType.CONCENTRIC:
                return this.createConcentricTexture();
            default:
                console.warn(`Unknown texture type: ${type}, falling back to grid`);
                return this.createGridTexture();
        }
    }
}

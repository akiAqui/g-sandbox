import * as THREE from 'three';

export function createProceduralTexture(size: number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  
  // 単一の青色の四角形を作成
  const color = {
    r: 50,   
    g: 50,   
    b: 255,  
    a: 255
  };
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      data[i] = color.r;     
      data[i + 1] = color.g; 
      data[i + 2] = color.b; 
      data[i + 3] = color.a; 
    }
  }
  
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

export function createNormalMap(size: number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  
  // グリッドのサイズを設定
  const gridSize = size / 4; // 4x4のグリッドを作成
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      
      // グリッド内での相対位置を計算
      const gridX = (x % gridSize) / gridSize;
      const gridY = (y % gridSize) / gridSize;
      
      // グリッドの中心からの距離を計算
      const dx = gridX - 0.5;
      const dy = gridY - 0.5;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // グリッド位置に基づいて凹凸を決定
      const isEvenGridX = Math.floor(x / gridSize) % 2 === 0;
      const isEvenGridY = Math.floor(y / gridSize) % 2 === 0;
      const shouldInvert = (isEvenGridX && isEvenGridY) || (!isEvenGridX && !isEvenGridY);
      
      // 法線の計算
      let nx = dx * 0.5;
      let ny = dy * 0.5;
      let nz = Math.cos(distance * Math.PI) * (shouldInvert ? -1.0 : 1.0);
      
      // 正規化
      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx /= length;
      ny /= length;
      nz /= length;
      
      // [0, 255]の範囲にマッピング
      data[i] = Math.floor((nx + 1) * 127.5);     // R
      data[i + 1] = Math.floor((ny + 1) * 127.5); // G
      data[i + 2] = Math.floor((nz + 1) * 127.5); // B
      data[i + 3] = 255;                          // A
    }
  }
  
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

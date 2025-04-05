// main.ts - OpenGL/WebGL/GLSL バージョン情報を取得するプログラム
import * as THREE from 'three';
import './style.css';

/**
 * OpenGL/WebGL バージョン情報を取得して表示する
 */
function getOpenGLVersionInfo(): void {
  // コンテナを作成
  const container = document.createElement('div');
  container.className = 'info-container';
  document.body.appendChild(container);
  
  // Three.jsのレンダラーを初期化 (DOM要素は追加しない)
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  
  // WebGLレンダリングコンテキストを取得
  const gl = renderer.getContext();
  
  // OpenGLの基本情報を取得
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  
  // セクションヘッダーを追加
  addSectionHeader(container, 'OpenGL/WebGL/GLSL バージョン情報');
  
  // バージョン情報
  const webGLVersion = gl.getParameter(gl.VERSION);
  const glslVersion = gl.getParameter(gl.SHADING_LANGUAGE_VERSION);
  
  addInfoItem(container, 'WebGL バージョン', webGLVersion);
  addInfoItem(container, 'GLSL バージョン', glslVersion);
  
  // WebGLバージョンに基づいてOpenGLバージョンを推定
  let estimatedGLVersion = 'Unknown';
  
  if (webGLVersion.includes('WebGL 2.0')) {
    estimatedGLVersion = 'OpenGL ES 3.0 or higher';
  } else if (webGLVersion.includes('WebGL 1.0')) {
    estimatedGLVersion = 'OpenGL ES 2.0 or higher';
  }
  
  addInfoItem(container, '推定 OpenGL バージョン', estimatedGLVersion);
  
  // ドライバー情報
  if (debugInfo) {
    addInfoItem(container, '実際のGPUベンダー', gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
    addInfoItem(container, '実際のGPUレンダラー', gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
  } else {
    addInfoItem(container, 'GPU ベンダー', gl.getParameter(gl.VENDOR));
    addInfoItem(container, 'GPU レンダラー', gl.getParameter(gl.RENDERER));
  }
  
  // WebGL2の場合は追加の制限情報を表示
  if (gl instanceof WebGL2RenderingContext) {
    addSectionHeader(container, 'WebGL2/OpenGL ES 3.0 の追加情報');
    const gl2 = gl as WebGL2RenderingContext;
    addInfoItem(container, '最大Uniform Blocks', gl2.getParameter(gl2.MAX_UNIFORM_BLOCKS).toString());
    addInfoItem(container, '最大サンプル数', gl2.getParameter(gl2.MAX_SAMPLES).toString());
    addInfoItem(container, '最大Draw Buffers', gl2.getParameter(gl2.MAX_DRAW_BUFFERS).toString());
    addInfoItem(container, '最大Color Attachments', gl2.getParameter(gl2.MAX_COLOR_ATTACHMENTS).toString());
    addInfoItem(container, '最大3Dテクスチャサイズ', gl2.getParameter(gl2.MAX_3D_TEXTURE_SIZE).toString());
  }
  
  // 共通の制限情報
  addSectionHeader(container, 'ハードウェア制限');
  addInfoItem(container, '最大テクスチャサイズ', `${gl.getParameter(gl.MAX_TEXTURE_SIZE)}px`);
  
  const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
  addInfoItem(container, '最大ビューポートサイズ', `${maxViewportDims[0]}x${maxViewportDims[1]}px`);
  
  addInfoItem(container, '最大フラグメントシェーダー変数', gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS).toString());
  addInfoItem(container, '最大頂点シェーダー変数', gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS).toString());
  addInfoItem(container, '最大テクスチャユニット数', gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS).toString());

  // 利用可能なGLSL拡張機能を確認
  const extensions = gl.getSupportedExtensions();
  const glslExtensions = extensions ? extensions.filter(ext => 
    ext.includes('shader') || ext.includes('SHADER') || ext.includes('texture') || ext.includes('TEXTURE')
  ) : [];
  
  if (glslExtensions.length > 0) {
    addSectionHeader(container, 'GLSL関連の拡張機能');
    const extList = document.createElement('ul');
    extList.className = 'extensions-list';
    glslExtensions.forEach(ext => {
      const item = document.createElement('li');
      item.textContent = ext;
      extList.appendChild(item);
    });
    container.appendChild(extList);
  }
  
  // 後片付け
  renderer.dispose();
}

/**
 * セクションヘッダーを追加
 */
function addSectionHeader(container: HTMLElement, title: string): void {
  const header = document.createElement('h2');
  header.textContent = title;
  container.appendChild(header);
}

/**
 * 情報項目を追加
 */
function addInfoItem(container: HTMLElement, label: string, value: string): void {
  const item = document.createElement('div');
  item.className = 'info-item';
  
  const labelElement = document.createElement('strong');
  labelElement.textContent = label + ': ';
  
  item.appendChild(labelElement);
  item.appendChild(document.createTextNode(value));
  
  container.appendChild(item);
}

/**
 * 様々なGLSLバージョンをテストして、サポート範囲を特定する
 */
function testDetailedShaderVersions(): void {
  // コンテナを作成
  const container = document.createElement('div');
  container.className = 'test-container';
  document.body.appendChild(container);
  
  addSectionHeader(container, 'GLSLバージョンサポートテスト');
  
  // レンダラーを作成
  const renderer = new THREE.WebGLRenderer();
  const gl = renderer.getContext();
  
  // WebGL1/2の確認
  const isWebGL2 = gl instanceof WebGL2RenderingContext;
  addInfoItem(container, 'WebGL バージョン', isWebGL2 ? 'WebGL 2.0' : 'WebGL 1.0');
  
  // WebGL1/ES 1.00シェーダーはサポートされている前提
  const basicVersionInfo = document.createElement('div');
  basicVersionInfo.className = 'info-item supported';
  basicVersionInfo.textContent = '[SUPPORTED] GLSL ES 1.00 (WebGL 1.0 基本)';
  container.appendChild(basicVersionInfo);
  
  // テスト用のバージョン配列 (OpenGL/GLSL標準とES規格)
  // 形式: [バージョン文字列, ES規格か, 人間可読名称]
  const testVersions = [
    // WebGL 1.0 / OpenGL ES 2.0 関連
    { version: '100', esVersion: true, name: 'GLSL ES 1.00 (WebGL 1.0)' },
    
    // WebGL 2.0 / OpenGL ES 3.0+ 関連
    { version: '300 es', esVersion: true, name: 'GLSL ES 3.00 (WebGL 2.0)' },
    { version: '310 es', esVersion: true, name: 'GLSL ES 3.10 (OpenGL ES 3.1)' },
    { version: '320 es', esVersion: true, name: 'GLSL ES 3.20 (OpenGL ES 3.2)' },
    
    // デスクトップOpenGL関連
    { version: '120', esVersion: false, name: 'GLSL 1.20 (OpenGL 2.1)' },
    { version: '130', esVersion: false, name: 'GLSL 1.30 (OpenGL 3.0)' },
    { version: '140', esVersion: false, name: 'GLSL 1.40 (OpenGL 3.1)' },
    { version: '150', esVersion: false, name: 'GLSL 1.50 (OpenGL 3.2)' },
    { version: '330', esVersion: false, name: 'GLSL 3.30 (OpenGL 3.3)' },
    { version: '400', esVersion: false, name: 'GLSL 4.00 (OpenGL 4.0)' },
    { version: '410', esVersion: false, name: 'GLSL 4.10 (OpenGL 4.1)' },
    { version: '420', esVersion: false, name: 'GLSL 4.20 (OpenGL 4.2)' },
    { version: '430', esVersion: false, name: 'GLSL 4.30 (OpenGL 4.3)' },
    { version: '440', esVersion: false, name: 'GLSL 4.40 (OpenGL 4.4)' },
    { version: '450', esVersion: false, name: 'GLSL 4.50 (OpenGL 4.5)' },
    { version: '460', esVersion: false, name: 'GLSL 4.60 (OpenGL 4.6)' }
  ];
  
  // 結果を保存する配列
  const results: { version: string, name: string, supported: boolean }[] = [];
  
  // 各バージョンのシェーダーをテスト
  testVersions.forEach(test => {
    const versionDirective = `#version ${test.version}`;
    
    // バージョンに応じた適切な構文を使用
    const isES3Plus = test.esVersion && test.version !== '100';
    const isDesktopGL3Plus = !test.esVersion && parseInt(test.version) >= 150;
    
    // 頂点シェーダーコード
    let vertexSource = versionDirective + '\n';
    
    // ES 3.00+/GL 3.30以降は in/out構文を使用
    if (isES3Plus || isDesktopGL3Plus) {
      vertexSource += `
        in vec3 position;
        out vec2 vUv;
        void main() {
          vUv = position.xy * 0.5 + 0.5;
          gl_Position = vec4(position, 1.0);
        }
      `;
    } else {
      // ES 1.00/GL 1.20-1.40は attribute/varying構文を使用
      vertexSource += `
        attribute vec3 position;
        varying vec2 vUv;
        void main() {
          vUv = position.xy * 0.5 + 0.5;
          gl_Position = vec4(position, 1.0);
        }
      `;
    }
    
    // フラグメントシェーダーコード
    let fragmentSource = versionDirective + '\n';
    
    // Desktop GLはprecisionが必須でない場合がある
    if (test.esVersion) {
      fragmentSource += 'precision mediump float;\n';
    }
    
    // ES 3.00+/GL 3.30以降は in/out構文を使用
    if (isES3Plus || isDesktopGL3Plus) {
      fragmentSource += `
        in vec2 vUv;
        out vec4 fragColor;
        void main() {
          fragColor = vec4(vUv, 0.5, 1.0);
        }
      `;
    } else {
      // ES 1.00/GL 1.20-1.40は varying/gl_FragColor構文を使用
      fragmentSource += `
        varying vec2 vUv;
        void main() {
          gl_FragColor = vec4(vUv, 0.5, 1.0);
        }
      `;
    }
    
    try {
      // 頂点シェーダーのコンパイルを試行
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      if (!vertexShader) throw new Error("頂点シェーダーを作成できませんでした");
      
      gl.shaderSource(vertexShader, vertexSource);
      gl.compileShader(vertexShader);
      
      const vertexSuccess = gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS);
      const vertexLog = gl.getShaderInfoLog(vertexShader);
      
      // フラグメントシェーダーのコンパイルを試行
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      if (!fragmentShader) throw new Error("フラグメントシェーダーを作成できませんでした");
      
      gl.shaderSource(fragmentShader, fragmentSource);
      gl.compileShader(fragmentShader);
      
      const fragmentSuccess = gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS);
      const fragmentLog = gl.getShaderInfoLog(fragmentShader);
      
      // 結果を記録
      const supported = vertexSuccess && fragmentSuccess;
      results.push({
        version: test.version,
        name: test.name,
        supported: supported
      });
      
      // シェーダーを削除
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      
    } catch (error) {
      // エラーが発生した場合は非サポートとして記録
      results.push({
        version: test.version,
        name: test.name,
        supported: false
      });
    }
  });
  
  // サポート状況をわかりやすく表示
  addSectionHeader(container, 'GLSLバージョンサポート一覧');
  
  // ES版とデスクトップ版に分類
  const esVersions = results.filter(r => r.version.includes('es') || r.version === '100');
  const desktopVersions = results.filter(r => !r.version.includes('es') && r.version !== '100');
  
  // ES/WebGLシェーダーの結果を表示
  const esHeader = document.createElement('h3');
  esHeader.textContent = 'OpenGL ES / WebGL シェーダー:';
  container.appendChild(esHeader);
  
  const esList = document.createElement('div');
  esList.className = 'version-list';
  esVersions.forEach(result => {
    const item = document.createElement('div');
    item.className = result.supported ? 'version-item supported' : 'version-item not-supported';
    item.textContent = `[${result.supported ? 'SUPPORTED' : 'NOT SUPPORTED'}] ${result.name}`;
    esList.appendChild(item);
  });
  container.appendChild(esList);
  
  // デスクトップOpenGLシェーダーの結果を表示
  const desktopHeader = document.createElement('h3');
  desktopHeader.textContent = 'デスクトップOpenGLシェーダー:';
  container.appendChild(desktopHeader);
  
  const desktopList = document.createElement('div');
  desktopList.className = 'version-list';
  desktopVersions.forEach(result => {
    const item = document.createElement('div');
    item.className = result.supported ? 'version-item supported' : 'version-item not-supported';
    item.textContent = `[${result.supported ? 'SUPPORTED' : 'NOT SUPPORTED'}] ${result.name}`;
    desktopList.appendChild(item);
  });
  container.appendChild(desktopList);
  
  // サポート境界を特定
  const supportedES = esVersions.filter(r => r.supported).map(r => r.version);
  const lastSupportedES = supportedES.length > 0 ? 
    esVersions.find(r => r.version === supportedES[supportedES.length - 1])?.name : 
    'なし';
  
  const supportedDesktop = desktopVersions.filter(r => r.supported).map(r => r.version);
  const lastSupportedDesktop = supportedDesktop.length > 0 ? 
    desktopVersions.find(r => r.version === supportedDesktop[supportedDesktop.length - 1])?.name : 
    'なし';
  
  // サポート境界を表示
  addSectionHeader(container, 'GLSLバージョンサポート境界');
  addInfoItem(container, '最高サポートES/WebGLバージョン', lastSupportedES);
  addInfoItem(container, '最高サポートデスクトップOpenGLバージョン', lastSupportedDesktop);
  
  // お勧めの使用バージョンを表示
  const recommendedVersion = isWebGL2 ? 
    (supportedES.includes('300 es') ? 'GLSL ES 3.00 (#version 300 es)' : 'GLSL ES 1.00 (#version 100)') :
    'GLSL ES 1.00 (#version 100)';
  
  const recommendDiv = document.createElement('div');
  recommendDiv.className = 'recommendation';
  recommendDiv.innerHTML = `
    <h3>推奨シェーダーバージョン</h3>
    <div class="recommended-version">${recommendedVersion}</div>
    <div class="note">(最も広い互換性と安定したサポートのあるバージョン)</div>
  `;
  container.appendChild(recommendDiv);
  
  // 後片付け
  renderer.dispose();
}

// DOMがロードされた後に実行
document.addEventListener('DOMContentLoaded', () => {
  // ページタイトルを設定
  const title = document.createElement('h1');
  title.textContent = 'OpenGL/GLSL バージョン診断ツール';
  title.className = 'page-title';
  document.body.appendChild(title);
  
  // 基本情報を取得して表示
  getOpenGLVersionInfo();
  
  // 詳細なGLSLシェーダーバージョンテストを実行
  testDetailedShaderVersions();
});

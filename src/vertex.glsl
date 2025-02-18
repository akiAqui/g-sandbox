precision mediump float;

varying vec2 vUv;  // Changed from vUV to vUv to match fragment shaders

void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
}

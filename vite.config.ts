import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  server:{
    host: true,
  },
  plugins: [glsl()],
});

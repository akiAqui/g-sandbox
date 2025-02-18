// src/configs/effectConfigs.ts

interface ParameterConfig {
  value: number;
  min: number;
  max: number;
  step?: number;
}

interface EffectConfig {
  name: string;
  shader: string;
  parameters: Record<string, ParameterConfig>;
}

export const effectConfigs: EffectConfig[] = [
  {
    name: 'Spiral Zoom',
    shader: 'spiral_zoom',
    parameters: {
      k: { value: 1.0, min: -5.0, max: 5.0, step: 0.1 },
      alpha: { value: 1.0, min: 0.1, max: 2.0, step: 0.1 },
      omega: { value: 1.0, min: 0.0, max: 5.0, step: 0.1 },
      epsilon: { value: 0.01, min: 0.001, max: 0.1, step: 0.001 }
    }
  },
  {
    name: 'Twirl',
    shader: 'twirl',
    parameters: {
      amount: { value: 1.0, min: -10.0, max: 10.0, step: 0.1 },
      beta: { value: 1.0, min: 0.1, max: 3.0, step: 0.1 }
    }
  },
  {
    name: 'Pinch/Punch',
    shader: 'pinch_punch',
    parameters: {
      alpha: { value: 1.0, min: 0.1, max: 3.0, step: 0.1 }
    }
  },
  {
    name: 'Nested Sine-Cosine',
    shader: 'nested_sine_cosine',
    parameters: {
      freq1: { value: 1.0, min: 0.1, max: 10.0, step: 0.1 },
      freq2: { value: 1.0, min: 0.1, max: 10.0, step: 0.1 },
      amp: { value: 0.5, min: 0.0, max: 1.0, step: 0.01 }
    }
  },
  {
    name: 'Ripple Wave',
    shader: 'ripple_wave',
    parameters: {
      ampX: { value: 0.1, min: 0.0, max: 0.5, step: 0.01 },
      ampY: { value: 0.1, min: 0.0, max: 0.5, step: 0.01 },
      omega: { value: 10.0, min: 0.0, max: 30.0, step: 0.5 },
      phase: { value: 0.0, min: 0.0, max: Math.PI * 2, step: 0.1 }
    }
  },
  {
    name: 'Polar Swirl',
    shader: 'polar_swirl',
    parameters: {
      alpha: { value: 0.2, min: 0.0, max: 1.0, step: 0.01 },
      beta: { value: 5.0, min: 0.1, max: 20.0, step: 0.1 },
      k: { value: 1.0, min: -5.0, max: 5.0, step: 0.1 }
    }
  },
  {
    name: 'Zooming Swirl',
    shader: 'zooming_swirl',
    parameters: {
      delta: { value: 0.5, min: -2.0, max: 2.0, step: 0.1 },
      k: { value: 1.0, min: -5.0, max: 5.0, step: 0.1 }
    }
  },
  {
    name: 'Sinusoidal Warp',
    shader: 'sinusoidal_warp',
    parameters: {
      ampX: { value: 0.1, min: 0.0, max: 0.5, step: 0.01 },
      ampY: { value: 0.1, min: 0.0, max: 0.5, step: 0.01 },
      freqX: { value: 5.0, min: 0.0, max: 20.0, step: 0.5 },
      freqY: { value: 5.0, min: 0.0, max: 20.0, step: 0.5 }
    }
  },
  {
    name: 'Spiral Vortex',
    shader: 'spiral_vortex',
    parameters: {
      alpha: { value: 2.0, min: 0.0, max: 5.0, step: 0.1 },
      beta: { value: 3.0, min: 0.1, max: 10.0, step: 0.1 }
    }
  },
  {
    name: 'Double Spiral Zoom',
    shader: 'double_spiral_zoom',
    parameters: {
      k1: { value: 1.0, min: -5.0, max: 5.0, step: 0.1 },
      k2: { value: 1.0, min: -5.0, max: 5.0, step: 0.1 },
      gamma: { value: 1.0, min: 0.1, max: 2.0, step: 0.1 },
      epsilon: { value: 0.01, min: 0.001, max: 0.1, step: 0.001 }
    }
  }
];

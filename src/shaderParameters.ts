interface ParameterConfig {
    value: number;
    min: number;
    max: number;
    step: number;
    label?: string;     // パラメータの日本語表示名
}

interface EffectConfig {
    name: string;       // エフェクトの識別子
    label: string;      // エフェクトの日本語表示名
    shader: string;     // シェーダーファイル名
    parameters: Record<string, ParameterConfig>;
}

export const effectConfigs: EffectConfig[] = [
    {
        name: 'spiral_zoom',
        label: 'スパイラルズーム',
        shader: 'spiral_zoom',
        parameters: {
            k: { 
                value: 1.0, 
                min: 0.0, 
                max: 5.0, 
                step: 0.1,
                label: '回転の強さ'
            },
            alpha: { 
                value: 1.0, 
                min: 0.1, 
                max: 2.0, 
                step: 0.1,
                label: 'スケール係数'
            },
            omega: { 
                value: 1.0, 
                min: 0.0, 
                max: 5.0, 
                step: 0.1,
                label: 'アニメーション速度'
            },
            epsilon: { 
                value: 0.01, 
                min: 0.001, 
                max: 0.1, 
                step: 0.001,
                label: '補正値'
            },
            timeScale: {
                value: 1.0,
                min: 0.0,
                max: 2.0,
                step: 0.1,
                label: '時間スケール'
            }
        }
    },
    {
        name: 'double_spiral_zoom',
        label: 'ダブルスパイラルズーム',
        shader: 'double_spiral_zoom',
        parameters: {
            k1: { 
                value: 1.0, 
                min: 0.0, 
                max: 5.0, 
                step: 0.1,
                label: '線形回転係数'
            },
            k2: { 
                value: 1.0, 
                min: 0.0, 
                max: 5.0, 
                step: 0.1,
                label: '対数回転係数'
            },
            gamma: { 
                value: 1.0, 
                min: 0.1, 
                max: 2.0, 
                step: 0.1,
                label: 'ズーム係数'
            },
            epsilon: { 
                value: 0.01, 
                min: 0.001, 
                max: 0.1, 
                step: 0.001,
                label: '補正値'
            },
            timeScale: {
                value: 1.0,
                min: 0.0,
                max: 2.0,
                step: 0.1,
                label: '時間スケール'
            }
        }
    },
    {
        name: 'twirl',
        label: 'ツイスト',
        shader: 'twirl',
        parameters: {
            amount: { 
                value: 5.0, 
                min: -10.0, 
                max: 10.0, 
                step: 0.1,
                label: '渦の強さ'
            },
            beta: { 
                value: 1.0, 
                min: 0.1, 
                max: 3.0, 
                step: 0.1,
                label: '非線形性'
            },
            timeScale: {
                value: 1.0,
                min: 0.0,
                max: 2.0,
                step: 0.1,
                label: '時間スケール'
            }
        }
    },
    {
        name: 'pinch_punch',
        label: 'ピンチ&パンチ',
        shader: 'pinch_punch',
        parameters: {
            alpha: { 
                value: 1.0, 
                min: 0.1, 
                max: 3.0, 
                step: 0.1,
                label: '変形強度'
            },
            timeScale: {
                value: 1.0,
                min: 0.0,
                max: 2.0,
                step: 0.1,
                label: '時間スケール'
            }
        }
    },
    {
        name: 'nested_sine_cosine',
        label: '入れ子サイン波',
        shader: 'nested_sine_cosine',
        parameters: {
            freq1: { 
                value: 3.0, 
                min: 1.0, 
                max: 10.0, 
                step: 0.1,
                label: '内側周波数'
            },
            freq2: { 
                value: 5.0, 
                min: 1.0, 
                max: 10.0, 
                step: 0.1,
                label: '外側周波数'
            },
            amp: { 
                value: 0.1, 
                min: 0.0, 
                max: 0.5, 
                step: 0.01,
                label: '振幅'
            },
            timeScale: {
                value: 1.0,
                min: 0.0,
                max: 2.0,
                step: 0.1,
                label: '時間スケール'
            }
        }
    },
    {
        name: 'ripple_wave',
        label: 'リップルウェーブ',
        shader: 'ripple_wave',
        parameters: {
            ampX: { 
                value: 0.1, 
                min: 0.0, 
                max: 0.5, 
                step: 0.01,
                label: 'X方向振幅'
            },
            ampY: { 
                value: 0.1, 
                min: 0.0, 
                max: 0.5, 
                step: 0.01,
                label: 'Y方向振幅'
            },
            omega: { 
                value: 10.0, 
                min: 1.0, 
                max: 20.0, 
                step: 0.5,
                label: '波の周波数'
            },
            phase: { 
                value: 0.0, 
                min: 0.0, 
                max: 6.28, 
                step: 0.1,
                label: '位相'
            },
            timeScale: {
                value: 1.0,
                min: 0.0,
                max: 2.0,
                step: 0.1,
                label: '時間スケール'
            }
        }
    },
    {
        name: 'polar_swirl',
        label: '極座標渦',
        shader: 'polar_swirl',
        parameters: {
            alpha: { 
                value: 0.2, 
                min: 0.0, 
                max: 1.0, 
                step: 0.01,
                label: '歪み強度'
            },
            beta: { 
                value: 5.0, 
                min: 1.0, 
                max: 10.0, 
                step: 0.1,
                label: '周波数'
            },
            k: { 
                value: 3.0, 
                min: 0.0, 
                max: 10.0, 
                step: 0.1,
                label: '回転係数'
            },
            timeScale: {
                value: 1.0,
                min: 0.0,
                max: 2.0,
                step: 0.1,
                label: '時間スケール'
            }
        }
    },
    {
        name: 'zooming_swirl',
        label: 'ズーム渦',
        shader: 'zooming_swirl',
        parameters: {
            delta: { 
                value: 0.1, 
                min: 0.0, 
                max: 0.5, 
                step: 0.01,
                label: 'ズーム速度'
            },
            k: { 
                value: 2.0, 
                min: 0.0, 
                max: 5.0, 
                step: 0.1,
                label: '回転速度'
            },
            timeScale: {
                value: 1.0,
                min: 0.0,
                max: 2.0,
                step: 0.1,
                label: '時間スケール'
            }
        }
    },
    {
        name: 'sinusoidal_warp',
        label: 'サイン波ワープ',
        shader: 'sinusoidal_warp',
        parameters: {
            ampX: { 
                value: 0.1, 
                min: 0.0, 
                max: 0.5, 
                step: 0.01,
                label: 'X方向振幅'
            },
            ampY: { 
                value: 0.1, 
                min: 0.0, 
                max: 0.5, 
                step: 0.01,
                label: 'Y方向振幅'
            },
            freqX: { 
                value: 5.0, 
                min: 0.0, 
                max: 20.0, 
                step: 0.5,
                label: 'X方向周波数'
            },
            freqY: { 
                value: 5.0, 
                min: 0.0, 
                max: 20.0, 
                step: 0.5,
                label: 'Y方向周波数'
            },
            timeScale: {
                value: 1.0,
                min: 0.0,
                max: 2.0,
                step: 0.1,
                label: '時間スケール'
            }
        }
    },
    {
        name: 'spiral_vortex',
        label: 'スパイラル渦',
        shader: 'spiral_vortex',
        parameters: {
            alpha: { 
                value: 5.0, 
                min: 0.0, 
                max: 10.0, 
                step: 0.1,
                label: '渦の強さ'
            },
            beta: { 
                value: 2.0, 
                min: 0.1, 
                max: 5.0, 
                step: 0.1,
                label: '減衰係数'
            },
            timeScale: {
                value: 1.0,
                min: 0.0,
                max: 2.0,
                step: 0.1,
                label: '時間スケール'
            }
        }
    }
];

export type { ParameterConfig, EffectConfig };

import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/svi-liveness.js',
      format: 'iife',
      name: 'SviLiveness',
      plugins: [terser({ format: { comments: false } })],
    },
    plugins: [resolve(), typescript()],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/svi-liveness.esm.js',
      format: 'esm',
    },
    plugins: [resolve(), typescript()],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/svi-liveness.dev.js',
      format: 'iife',
      name: 'SviLiveness',
    },
    plugins: [resolve(), typescript()],
  },
];
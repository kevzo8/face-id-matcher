import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import resolve from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/svi-id-ocr.js',
      format: 'iife',
      name: 'SviIdOcr',
      plugins: [terser({ format: { comments: false } })],
    },
    plugins: [resolve(), typescript()],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/svi-id-ocr.esm.js',
      format: 'esm',
    },
    plugins: [resolve(), typescript()],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/svi-id-ocr.dev.js',
      format: 'iife',
      name: 'SviIdOcr',
    },
    plugins: [resolve(), typescript()],
  },
];

import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import postcss from 'rollup-plugin-postcss'
import { babel } from '@rollup/plugin-babel'

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/vant-extend.js',
    format: 'esm',
    sourcemap: true,
  },
  plugins: [
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
    }),
    resolve(),
    commonjs(),
    postcss({
      extract: true,
      minimize: true,
    }),
  ],
  external: ['vant', 'vue'],
}

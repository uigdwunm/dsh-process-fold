import { build } from 'esbuild'

// 浏览器半构建：CJS 输出 + 外层 window.__ModuleLoader__.load 包装。
// 官方 client 契约（参考 plugin-registry 的 packages/plugin/console 的
// tsdown banner/footer 模式）：module/exports 定义放 banner（intro 会被
// esbuild 折叠内联，footer 引 module 会 ReferenceError），footer 返回 exports。
await build({
  entryPoints: ['src/client.ts'],
  outfile: 'lib/client.js',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  bundle: true,
  // 官方包由 profile 的 pnpm 闭包在挂载时注入，不打包。
  external: ['@deepseek-ai/*', 'react'],
  banner: {
    js: 'window.__ModuleLoader__.load({ id: "dsh-process-fold", factory: (require) => { var module = { exports: {} }; var exports = module.exports;',
  },
  footer: {
    js: 'return module.exports; } });',
  },
})

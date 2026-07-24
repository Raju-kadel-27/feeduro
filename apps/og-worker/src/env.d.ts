// Teach TypeScript about wasm imports bundled via the wrangler CompiledWasm rule.
declare module "*.wasm" {
  const module: WebAssembly.Module;
  export default module;
}

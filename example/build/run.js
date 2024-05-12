// this file is here to check the result and is not generated

import { readFileSync } from "node:fs";

const wasm = readFileSync(new URL("app.wasm", import.meta.url));

const wasmModule = new WebAssembly.Module(wasm);
const wasmInstance = new WebAssembly.Instance(wasmModule);

const [strPtr, num] = wasmInstance.exports.getAnswer();

console.log(readString(wasmInstance.exports.memory, strPtr), num);

function readString(memory, offset) {
  const bytes = new Uint8Array(memory.buffer, offset);
  return new TextDecoder("utf8").decode(bytes.subarray(0, bytes.indexOf(0)));
}

import { assert } from "chai";
import { preprocessor } from "../wasmpp.js";

describe("preprocessor()", function () {
  it("should return the same code where there are no macros and directives", function () {
    const sample1 = `\
(module
  ;; mdn/webassembly-examples/understanding-text-format/wasm-table.wat
  (table 2 anyfunc)
  (func $f1 (result i32)
    i32.const 42
  )
  (func $f2 (result i32)
    i32.const 13
  )
  (elem (i32.const 0) $f1 $f2)
  (type $return_i32 (func (result i32)))
  (func (export "callByIndex") (param $i i32) (result i32)
    local.get $i
    call_indirect (type $return_i32)
  )
)
`;
    assert.strictEqual(
      preprocessor({ pathname: "test", source: sample1 }),
      sample1
    );
  });

  it("should process initial object-like macros", function () {
    assert.strictEqual(
      preprocessor({
        pathname: "test",
        source: "aaa (bbb eee ccc) ddd ccc(;;)eee",
        macros: ["aaa 111", "ccc 222", "eee"],
      }),
      "111 (bbb  222) ddd 222(;;)"
    );
    assert.strictEqual(
      preprocessor({
        pathname: "test",
        source: "aaa (bbb ccc ddd)",
        macros: [" (;;) aaa  a(1 2  3) ", "ccc aaa"],
      }),
      "a(1 2  3) (bbb aaa ddd)"
    );
  });

  it("should process initial function-like macros", function () {
    assert.strictEqual(
      preprocessor({
        pathname: "test",
        source: "(;;) (aaa 1 2) (b)",
        macros: ["(aaa x y)   y(y)x x  "],
      }),
      "(;;) 2(2)1 1 (b)"
    );

    assert.strictEqual(
      preprocessor({
        pathname: "test",
        source: "(a b c)",
        macros: ["(a x y) x: x  y: y  d: d", "b 1", "c 2", "d 3"],
      }),
      "x: 1  y: 2  d: 3"
    );
  });

  it("should throw an exception if the number of arguments of function-like macros does not match", function () {
    assert.throws(() =>
      preprocessor({
        pathname: "test",
        source: "(aaa w z)",
        macros: ["(aaa x y)", "z"],
      })
    );
  });
});

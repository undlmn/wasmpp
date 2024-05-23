import { assert } from "chai";
import { parse, cons, isCons } from "../s-expression.js";

describe("s-expression", function () {
  describe("cons()", function () {
    it("should create cons pair", function () {
      const c = cons("a", cons("b"));
      assert.equal(c.constructor.name, "Cons");
      assert.equal(c.toString(), "a b");
    });

    it("should throw an exception if x is the wrong type", function () {
      assert.throws(() => cons());
      assert.throws(() => cons(0));
    });

    it("should throw an exception if y is the wrong type", function () {
      assert.throws(() => cons(null, 0));
    });
  });

  describe("isCons()", function () {
    it("should check whether the value is a сons pair", function () {
      const c = cons("a", cons("b"));
      assert.ok(isCons(cons("a")));
      assert.notOk(isCons(null));
      assert.notOk(isCons({}));
    });
  });

  describe("parse()", function () {
    it("should return null if an empty string is passed", function () {
      assert.strictEqual(parse(""), null);
    });

    it("should throw an exception if the block-comment is not closed", function () {
      assert.throws(() => parse("a (;b c"));
      assert.throws(() => parse("a b c(;"));
    });

    it("should throw an exception if the quoted string is not closed", function () {
      assert.throws(() => parse('aaa "bbb ccc'));
      assert.throws(() => parse('aaa bbb ccc"'));
    });

    it("should throw an exception if the list is not closed", function () {
      assert.throws(() => parse("aaa (bbb ccc"));
      assert.throws(() => parse("aaa bbb ccc(()"));
    });

    it("should throw an exception if closed of a non-existent list", function () {
      assert.throws(() => parse("aaa bbb) ccc"));
      assert.throws(() => parse("aaa bbb ccc())"));
    });
  });

  describe("#toString()", function () {
    const sample1 = `\
(module
  ;; github:mdn/webassembly-examples/other-examples/simple-name-section.wat
  (func (;0;) $i (import "imports" "imported_func") (param i32))
  (func (;1;) (export "exported_func")
    i32.const 42
    call $i
  )
)`;
    const sample2 = `\
(module
  ;; github:mdn/webassembly-examples/understanding-text-format/multi-memory.wat
  (import "console" "log" (func (;0;) $log (param i32 i32 i32)))

  (import "js" "mem0" (memory 1))
  (import "js" "mem1" (memory 1))
  
  ;; Create and export a third memory
  (memory $mem2 1)
  (export "memory2" (memory $mem2))

  (data (memory 0) (i32.const 0) "Memory 0 data")
  (data (memory 1) (i32.const 0) "Memory 1 data")
  (data (memory 2) (i32.const 0) "Memory 2 data")
  
  ;; Add text to default (0-index) memory
  (data (i32.const 13) " (Default)")

  (func (;1;) $logMemory (param $memIndex i32) (param $memOffSet i32) (param $stringLength i32)
    local.get $memIndex
    local.get $memOffSet
    local.get $stringLength
    call $log
  )

  (func (;2;) (export "logAllMemory")
    ;; Log memory index 0, offset 0
    (i32.const 0)  ;; memory index 0
    (i32.const 0)  ;; memory offset 0
    (i32.const 23)  ;; string length 23
    (call $logMemory)

    ;; Log memory index 1, offset 0
    i32.const 1  ;; memory index 1
    i32.const 0  ;; memory offset 0
    i32.const 20  ;; string length 20 - overruns the length of the data for illustration
    call $logMemory

    ;; Log memory index 2, offset 0
    i32.const 2  ;; memory index 2
    i32.const 0  ;; memory offset 0
    i32.const 13  ;; string length 13
    call $logMemory
  )
)
`;

    it("should restore the expression without changes", function () {
      assert.strictEqual(parse(sample1).toString(), sample1);
      assert.strictEqual(parse(sample2).toString(), sample2);
    });

    it("should remove comments on demand", function () {
      assert.strictEqual(
        parse(sample1).toString({ comments: false }),
        `\
(module
  
  (func  $i (import "imports" "imported_func") (param i32))
  (func  (export "exported_func")
    i32.const 42
    call $i
  )
)`
      );
      assert.strictEqual(
        parse(sample2).toString({ comments: false }),
        `\
(module
  
  (import "console" "log" (func  $log (param i32 i32 i32)))

  (import "js" "mem0" (memory 1))
  (import "js" "mem1" (memory 1))
  
  
  (memory $mem2 1)
  (export "memory2" (memory $mem2))

  (data (memory 0) (i32.const 0) "Memory 0 data")
  (data (memory 1) (i32.const 0) "Memory 1 data")
  (data (memory 2) (i32.const 0) "Memory 2 data")
  
  
  (data (i32.const 13) " (Default)")

  (func  $logMemory (param $memIndex i32) (param $memOffSet i32) (param $stringLength i32)
    local.get $memIndex
    local.get $memOffSet
    local.get $stringLength
    call $log
  )

  (func  (export "logAllMemory")
    
    (i32.const 0)  
    (i32.const 0)  
    (i32.const 23)  
    (call $logMemory)

    
    i32.const 1  
    i32.const 0  
    i32.const 20  
    call $logMemory

    
    i32.const 2  
    i32.const 0  
    i32.const 13  
    call $logMemory
  )
)
`
      );
    });

    it("should remove whitespaces on demand", function () {
      assert.strictEqual(
        parse(sample1).toString({ spaces: false }),
        `\
(module;; github:mdn/webassembly-examples/other-examples/simple-name-section.wat
(func(;0;)$i(import "imports" "imported_func")(param i32))(func(;1;)(export "exported_func")i32.const 42 call $i))`
      );
      assert.strictEqual(
        parse(sample2).toString({ spaces: false }),
        `\
(module;; github:mdn/webassembly-examples/understanding-text-format/multi-memory.wat
(import "console" "log"(func(;0;)$log(param i32 i32 i32)))(import "js" "mem0"(memory 1))(import "js" "mem1"(memory 1));; Create and export a third memory
(memory $mem2 1)(export "memory2"(memory $mem2))(data(memory 0)(i32.const 0)"Memory 0 data")(data(memory 1)(i32.const 0)"Memory 1 data")(data(memory 2)(i32.const 0)"Memory 2 data");; Add text to default (0-index) memory
(data(i32.const 13)" (Default)")(func(;1;)$logMemory(param $memIndex i32)(param $memOffSet i32)(param $stringLength i32)local.get $memIndex local.get $memOffSet local.get $stringLength call $log)(func(;2;)(export "logAllMemory");; Log memory index 0, offset 0
(i32.const 0);; memory index 0
(i32.const 0);; memory offset 0
(i32.const 23);; string length 23
(call $logMemory);; Log memory index 1, offset 0
i32.const 1;; memory index 1
i32.const 0;; memory offset 0
i32.const 20;; string length 20 - overruns the length of the data for illustration
call $logMemory;; Log memory index 2, offset 0
i32.const 2;; memory index 2
i32.const 0;; memory offset 0
i32.const 13;; string length 13
call $logMemory))`
      );
    });

    it("should remove comments and whitespaces on demand", function () {
      assert.strictEqual(
        parse(sample1).toString({ comments: false, spaces: false }),
        '(module(func $i(import "imports" "imported_func")(param i32))(func(export "exported_func")i32.const 42 call $i))'
      );
      assert.strictEqual(
        parse(sample2).toString({ comments: false, spaces: false }),
        '(module(import "console" "log"(func $log(param i32 i32 i32)))(import "js" "mem0"(memory 1))(import "js" "mem1"(memory 1))(memory $mem2 1)(export "memory2"(memory $mem2))(data(memory 0)(i32.const 0)"Memory 0 data")(data(memory 1)(i32.const 0)"Memory 1 data")(data(memory 2)(i32.const 0)"Memory 2 data")(data(i32.const 13)" (Default)")(func $logMemory(param $memIndex i32)(param $memOffSet i32)(param $stringLength i32)local.get $memIndex local.get $memOffSet local.get $stringLength call $log)(func(export "logAllMemory")(i32.const 0)(i32.const 0)(i32.const 23)(call $logMemory)i32.const 1 i32.const 0 i32.const 20 call $logMemory i32.const 2 i32.const 0 i32.const 13 call $logMemory))'
      );
    });
  });

  describe("#copy()", function () {
    it("should copy part of list", function () {
      const list = parse(" 1 2 3 4 5 ");
      const start = list.element.y.element;
      const stop = start.y.element.y.element.y;
      assert.strictEqual(start.copy(stop).toString(), "2 3 4");
    });
  });

  describe("#trim()", function () {
    it("should remove whitespaces from both ends", function () {
      assert.strictEqual(parse(" 1 2 3 ").trim().toString(), "1 2 3");
      assert.strictEqual(parse("\n\n()1 2 ;; ").trim().toString(), "()1 2 ;; ");
      assert.strictEqual(parse("   ").trim(), null);
    });
  });
});

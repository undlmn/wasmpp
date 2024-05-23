import { assert } from "chai";
import { preprocessor } from "../wasmpp.js";

describe("directives", function () {
  describe("#define", function () {
    it("should define object-like macro", function () {
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#define aaa 1 2) aaa ;;",
        }),
        "(;#define aaa 1 2;) 1 2 ;;"
      );
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#define a 1)(#define b a)a b",
        }),
        "(;#define a 1;)(;#define b 1;)1 1"
      );
    });

    it("should throw an exception if incorrect identifier", function () {
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#define)" })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#define ())" })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: '(#define "a" 1)' })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#define ((a) 1))" })
      );
    });

    it("should define function-like macro", function () {
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#define (aaa x y)  y x  )aaa(aaa 1 2);;",
        }),
        "(;#define (aaa x y)y x;)aaa 2 1;;"
      );
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source:
            "(#define c 0)(#define(a x)x c)(#define c 1)(a 8)(#define c 2)(a 9)",
        }),
        "(;#define c 0;)(;#define (a x)x c;)(;#define c 1;)8 1(;#define c 2;)9 2"
      );
    });
  });

  describe("#defined", function () {
    it("should return 1 if the macro is defined", function () {
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          macros: ["a 1"],
          source: "(#defined a)",
        }),
        "1"
      );
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          macros: ["(a x) x"],
          source: "(#defined a)",
        }),
        "1"
      );
      assert.strictEqual(
        preprocessor({ pathname: "test", source: "(#define a)(#defined a)" }),
        "(;#define a;)1"
      );
    });

    it("should return 0 if the macro is not defined", function () {
      assert.strictEqual(
        preprocessor({ pathname: "test", source: "(#defined  a (;...;)  )" }),
        "0"
      );
    });

    it("should throw an exception if the format is incorrect", function () {
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#defined)" })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: '(#defined "1")' })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#defined (a x))" })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#defined a 1)" })
      );
    });
  });

  describe("#undef", function () {
    it("should undefine macro", function () {
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          macros: ["a 1"],
          source: "(#undef a)a",
        }),
        "(;#undef a;)a"
      );
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#define (a)(;<;)(;>;))(a)(#undef a)(a)",
        }),
        "(;#define (a);)(;<;)(;>;)(;#undef a;)(a)"
      );
    });

    it("should throw an exception if the format is incorrect", function () {
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#undef)" })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: '(#undef "1")' })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#undef (a x))" })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#undef a 1)" })
      );
    });
  });

  describe("#ifdef", function () {
    it("should place the statements if macro defined", function () {
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          macros: ["a 1"],
          source: "(#ifdef a 1 2 3)",
        }),
        "1 2 3"
      );
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#define (a x) x)(#ifdef a 1 2 3)()",
        }),
        "(;#define (a x)x;)1 2 3()"
      );
    });

    it("should not place the statements if macro not defined", function () {
      assert.strictEqual(
        preprocessor({ pathname: "test", source: "(#ifdef a 1 2 3)" }),
        "(;#ifdef a // false;)"
      );
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source:
            "(#define a)(#ifdef a (#define c 1))(#ifdef b (#define c 2))c",
        }),
        "(;#define a;)(;#define c 1;)(;#ifdef b // false;)1"
      );
      assert.strictEqual(
        preprocessor({ pathname: "test", macros: ["a"], source: "(#ifdef a)" }),
        ""
      );
    });

    it("should throw an exception if the format is incorrect", function () {
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#ifdef)" })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: '(#ifdef "1")' })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#ifdef (a x))" })
      );
    });
  });

  describe("#ifndef", function () {
    it("should place the statements if macro not defined", function () {
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#ifndef a 1 2 3)",
        }),
        "1 2 3"
      );
    });

    it("should not place the statements if macro defined", function () {
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          macros: ["a"],
          source: "(#ifndef a 1 2 3)",
        }),
        "(;#ifndef a // false;)"
      );
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source:
            "(#ifndef a (#define b 1))(#define a)(#ifndef a (#define b 2))b",
        }),
        "(;#define b 1;)(;#define a;)(;#ifndef a // false;)1"
      );
      assert.strictEqual(
        preprocessor({ pathname: "test", source: "(#ifndef a)" }),
        ""
      );
    });

    it("should throw an exception if the format is incorrect", function () {
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#ifndef)" })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: '(#ifndef "1")' })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#ifndef (a x))" })
      );
    });
  });

  describe("#if", function () {
    it("should place the statements if expression is truthy", function () {
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#if (1 + 2) 1 2 3)",
        }),
        "1 2 3"
      );
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#if (!0))",
        }),
        ""
      );
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#define a 1)(#if (a) b)",
        }),
        "(;#define a 1;)b"
      );
    });

    it("should not place the statements if expression is not truthy", function () {
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#if (1 == 2) 1 2 3)",
        }),
        "(;#if (1 == 2) // false;)"
      );
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#define a false)(#if (a) b)",
        }),
        "(;#define a false;)(;#if (false) // false;)"
      );
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#define a)(#if (a) b)",
        }),
        "(;#define a;)(;#if () // false;)"
      );
    });

    it("should throw an exception if the format is incorrect", function () {
      assert.throws(() => preprocessor({ pathname: "test", source: "(#if)" }));
      assert.throws(() =>
        preprocessor({ pathname: "test", source: '(#if "1")' })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#if a)" })
      );
    });
  });

  describe("#eval", function () {
    it("should evaluates expression", function () {
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#eval let a = 1; a + 2)",
        }),
        "3"
      );
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#eval globalThis.a = 1) (#eval a)",
        }),
        "1 1"
      );
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#define a 4)[(#eval let b = a ; b)]",
        }),
        "(;#define a 4;)[ 4 ]"
      );
      assert.strictEqual(
        preprocessor({
          pathname: "test",
          source: "(#eval)",
        }),
        "undefined"
      );
    });
  });

  describe("#include", function () {
    it("should include data file", function () {
      assert.strictEqual(
        preprocessor({
          pathname: "spec/test",
          source: "1(#include data sample.wat)2",
        }),
        `1;; sample.wat
"\\28\\66\\75\\6e\\63\\20\\24\\66\\75\\6e\\63\\20\\28\\72\\65\\73\\75\\6c\\74\\20\\69\\33\\32\\29\\0a\\20"
"\\20\\69\\33\\32\\2e\\63\\6f\\6e\\73\\74\\20\\34\\32\\0a\\29\\0a" 2`
      );
      assert.strictEqual(
        preprocessor({
          pathname: "spec/test",
          source: '(#include data "sample.wat")',
        }),
        `;; "sample.wat"
"\\28\\66\\75\\6e\\63\\20\\24\\66\\75\\6e\\63\\20\\28\\72\\65\\73\\75\\6c\\74\\20\\69\\33\\32\\29\\0a\\20"
"\\20\\69\\33\\32\\2e\\63\\6f\\6e\\73\\74\\20\\34\\32\\0a\\29\\0a"`
      );
    });

    it("should include file", function () {
      assert.strictEqual(
        preprocessor({
          pathname: "spec/test",
          source: "(#include sample.wat)",
        }),
        `
;; ==== including sample.wat ====
(func $func (result i32)
  i32.const 42
)
;; ==== end of sample.wat ====
`
      );
      assert.strictEqual(
        preprocessor({
          pathname: "spec/test",
          source: '(#include "./sample.wat")',
        }),
        `
;; ==== including "./sample.wat" ====
(func $func (result i32)
  i32.const 42
)
;; ==== end of "./sample.wat" ====
`
      );
    });

    it("should throw an exception if the format is incorrect", function () {
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#include)" })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#include (file))" })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#include data)" })
      );
    });
  });

  describe("#size", function () {
    it("should return file size", function () {
      assert.strictEqual(
        preprocessor({
          pathname: "spec/test",
          source: "1(#size sample.wat)2",
        }),
        `1 42 2`
      );
      assert.strictEqual(
        preprocessor({
          pathname: "spec/test",
          source: '(#size "././sample.wat")',
        }),
        `42`
      );
    });

    it("should throw an exception if the format is incorrect", function () {
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#size)" })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#size (file))" })
      );
      assert.throws(() =>
        preprocessor({ pathname: "test", source: "(#size 1 2 3)" })
      );
    });
  });
});

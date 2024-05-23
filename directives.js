import { readFileSync } from "node:fs";
import { parse, cons } from "./s-expression.js";
import {
  define,
  objMacros,
  funcMacros,
  resolve,
  files,
  processList,
  processFile,
} from "./wasmpp.js";
import jailEval from "./jail-eval.js";

export default {
  /**
   * (#define <identifier> ...<replacement>)
   * (#define (identifier ...<parameters>) ...<replacement>)
   */
  ["#define"](list, args) {
    const id = list?.element;
    id && id.type == "symbol" && (id.y = processList(id.y, args));
    define(list);
    return cons(
      `(;#define${
        list ? " " + list.toString({ comments: false, spaces: false }) : ""
      };)`
    );
  },

  /**
   * (#defined <identifier>)
   */
  ["#defined"](list) {
    const id = list?.element;
    if (!id || id.type != "symbol") {
      throw new Error("There is no identifier");
    }
    if (id.y?.element) {
      throw new Error("Too many arguments");
    }
    return cons(objMacros.has(id.x) || funcMacros.has(id.x) ? "1" : "0");
  },

  /**
   * (#undef <identifier>)
   */
  ["#undef"](list) {
    const id = list?.element;
    if (!id || id.type != "symbol") {
      throw new Error("There is no identifier");
    }
    if (id.y?.element) {
      throw new Error("Too many arguments");
    }
    objMacros.delete(id.x);
    funcMacros.delete(id.x);
    return cons(`(;#undef ${id.x};)`);
  },

  /**
   * (#ifdef <identifier> ...<statement>)
   */
  ["#ifdef"](list, args) {
    const id = list?.element;
    if (!id || id.type != "symbol") {
      throw new Error("There is no identifier");
    }
    return objMacros.has(id.x) || funcMacros.has(id.x)
      ? id.y && processList(id.y.trim(), args)
      : cons(`(;#ifdef ${id.x} // false;)`);
  },

  /**
   * (#ifndef <identifier> ...<statement>)
   */
  ["#ifndef"](list, args) {
    const id = list?.element;
    if (!id || id.type != "symbol") {
      throw new Error("There is no identifier");
    }
    return objMacros.has(id.x) || funcMacros.has(id.x)
      ? cons(`(;#ifndef ${id.x} // false;)`)
      : id.y && processList(id.y.trim(), args);
  },

  /**
   * (#if (...<expression>) ...<statement>)
   */
  ["#if"](list, args) {
    const expr = list?.element;
    if (!expr || expr.type != "list") {
      throw new Error("There is no conditional expression");
    }
    const x =
      processList(expr.x.trim(), args)?.toString({ comments: false }) ?? "";
    return jailEval(x)
      ? expr.y && processList(expr.y.trim(), args)
      : cons(`(;#if (${x}) // false;)`);
  },

  /**
   * (#eval ...<expression>)
   */
  ["#eval"](list, args) {
    return parse(
      String(
        jailEval(
          (list &&
            processList(list.trim(), args)?.toString({ comments: false })) ??
            ""
        )
      )
    );
  },

  /**
   * (#include <filepath>)
   * (#include data <filepath>)
   */
  ["#include"](list) {
    const first = list?.element;
    if (first) {
      if (first.x === "data") {
        const second = first.y?.element;
        if (second && (second.type == "symbol" || second.type == "string")) {
          if (second.y?.element) {
            throw new Error("Too many arguments");
          }
          const buffer = readFileSync(resolve(second.x));
          let res = `;; ${second.x}\n"`;
          let i = 0;
          for (const byte of buffer) {
            if (i && i % 26 == 0) {
              res += '"\n"';
            }
            i++;
            res += `\\${byte.toString(16).padStart(2, 0)}`;
          }
          res += '"';
          return parse(res);
        }
      } else if (first.type == "symbol" || first.type == "string") {
        if (first.y?.element) {
          throw new Error("Too many arguments");
        }
        const pathname = resolve(first.x);
        if (files.includes(pathname)) {
          throw new Error("Recursion detected");
        }
        const res = cons(
          "\n",
          cons(`;; ==== including ${first.x} ====\n`, processFile(pathname))
        );
        res.tail.y = cons(`;; ==== end of ${first.x} ====\n`);
        return res;
      }
    }
    throw new Error("The file path is not specified");
  },

  /**
   * (#size <filepath>)
   */
  ["#size"](list) {
    const file = list?.element;
    if (file && (file.type == "symbol" || file.type == "string")) {
      if (file.y?.element) {
        throw new Error("Too many arguments");
      }
      return cons(String(readFileSync(resolve(file.x)).length));
    }
    throw new Error("The file path is not specified");
  },
};

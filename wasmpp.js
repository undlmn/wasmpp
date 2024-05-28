/**
 * WebAssembly Text Preprocessor
 * by undlmn 2024
 */

import Path from "node:path";
import { readFileSync } from "node:fs";
import { parse, isCons } from "./s-expression.js";
import builtInDirectives from "./directives.js";

/**
 * Preprocessor
 *
 * if the source code is not passed, it will be read from the file.
 * The file path is required to resolve relative paths for inclusions.
 * @param {Object} options
 * @param {string} [options.source] - the source code
 * @param {string} options.pathname - the path to the source file
 * @param {string} [options.root="/"] - the root directory for resolving the absolute paths to the inclusions
 * @param {string[]} [options.macros=[]] - initial macros definitions "<identifier> ...<replacement>"
 * @param {boolean} [options.comments=true] - leave all comments
 * @param {boolean} [options.spaces=true] - leave all spaces
 * @param {Object<string,function>} [options.directives] - custom extra directives
 * @returns {string}
 */
export function preprocessor({
  source,
  pathname,
  root = "/",
  macros = [],
  comments = true,
  spaces = true,
  directives: extraDirectives,
}) {
  rootDir = root;
  objMacros.clear();
  funcMacros.clear();
  macros.forEach((macro) => {
    try {
      define(parse(macro));
    } catch (err) {
      throw Error(`${err.message}: '${macro}'${err.at ? ` at ${err.at}` : ""}`);
    }
  });
  directives = { ...builtInDirectives, ...extraDirectives };
  const list = processFile(Path.resolve(pathname), source);
  return list ? list.toString({ comments, spaces }) : "";
}

/** @type {string} */
let rootDir;

/** @type {string[]} */
export const files = [];

/**
 * @param {string} pathname
 * @returns {string}
 */
export function resolve(pathname) {
  if (pathname[0] == '"') {
    pathname = pathname.slice(1, -1).replace(/\\"/g, '"');
  }
  return pathname[0] == "/"
    ? Path.resolve(rootDir, pathname.slice(1))
    : Path.resolve(Path.dirname(files[files.length - 1]), pathname);
}

export const objMacros = new Map();
export const funcMacros = new Map();

/**
 * Define macro
 * @param {Cons|null}
 */
export function define(list) {
  const id = list && list.element;
  if (id && id.type == "symbol") {
    objMacros.set(id.x, id.y && id.y.trim());
    return;
  }
  if (id && id.type == "list") {
    let funcId = id.x.element;
    if (funcId && funcId.type == "symbol") {
      const args = [];
      let item = funcId.y;
      item &&= item.element;
      while (item) {
        if (item.type != "symbol") {
          throw new Error(
            "The arguments of function-like macros can only be symbols"
          );
        }
        args.push(item.x);
        item = item.y;
        item &&= item.element;
      }
      funcMacros.set(funcId.x, [args, id.y && id.y.trim()]);
      return;
    }
  }
  throw new Error("There is no identifier in the macro definition");
}

/** @type {Object<string,function>} */
let directives;

/**
 * @param {string} pathname
 * @param {string?} source
 * @returns {Cons|null}
 */
export function processFile(pathname, source = null) {
  files.push(pathname);
  if (source == null) {
    source = readFileSync(pathname, "utf8");
  }
  try {
    let list = parse(source);
    list = processList(list);
    files.pop();
    return list;
  } catch (err) {
    throw new Error(
      (err.list
        ? "(" + err.list.toString({ comments: false, spaces: false }) + ") >> "
        : "") +
        err.message +
        '\n\tat "' +
        pathname +
        (err.at ? ":" + err.at : "") +
        '"'
    );
  }
}

/**
 * @param {Cons|null} list
 * @param {Map<string,*>} [args]
 * @returns {Cons|null}
 */
export function processList(list, args) {
  try {
    let prev = null;
    let item = list;
    while (item) {
      let type = item.type;

      function replace(replacement) {
        if (replacement) {
          prev ? (prev.y = replacement) : (list = replacement);
          prev = replacement.tail;
          prev.y = item.y;
          item.y = null;
          item = prev.y;
        } else {
          prev ? (prev.y = item.y) : (list = item.y);
          item.y = null;
          item = prev ? prev.y : list;
        }
      }

      // Process object-like macros
      if (type == "symbol" && objMacros.has(item.x)) {
        replace(objMacros.get(item.x)?.copy());
        continue;
      }

      // Process args
      if (type == "symbol" && args?.has(item.x)) {
        const value = args.get(item.x);
        item.x = isCons(value) ? value.copy() : value;
      }

      if (type == "list") {
        try {
          const id = item.x.element;
          if (id && id.type == "symbol") {
            //
            // Process function-like macros
            if (funcMacros.has(id.x)) {
              try {
                id.y = processList(id.y, args);
                const argsValues = [];
                let item = id.y;
                item &&= item.element;
                while (item) {
                  argsValues.push(item.x);
                  item = item.y;
                  item &&= item.element;
                }
                const [argsIds, replacement] = funcMacros.get(id.x);
                if (argsIds.length != argsValues.length) {
                  throw new Error(
                    `Expected ${argsIds.length} argument${
                      argsIds.length == 1 ? "" : "s"
                    } got ${argsValues.length}`
                  );
                }
                const replaceArgs = new Map();
                argsIds.forEach((id, i) => replaceArgs.set(id, argsValues[i]));
                replace(
                  processList(
                    replacement?.copy() ?? null,
                    replaceArgs
                  )?.trim() ?? null
                );
                continue;
              } catch (err) {
                throw new Error(`Call macro '${id.x}' >> ${err.message}`);
              }
            }

            // Process directives
            if (Object.hasOwn(directives, id.x)) {
              replace(directives[id.x](id.y, args));
              continue;
            }
          }
          item.x = processList(item.x, args);
        } catch (err) {
          err.list == null && (err.list = item.x);
          throw err;
        }
      }
      item = (prev = item).y;
    }
    return list;
  } catch (err) {
    err.list == null && (err.list = list);
    throw err;
  }
}

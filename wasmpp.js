/**
 * WebAssembly Text Preprocessor
 * by undlmn 2024
 */

import { resolve, dirname } from "node:path";
import { readFileSync } from "node:fs";

// prettier-ignore
const DIRECTIVES = {
  define:   "#define",   // (#define <identifier> ...<replacement>)
  defined:  "#defined",  // (#defined <identifier>)
  undef:    "#undef",    // (#undef <identifier>)
  eval:     "#eval",     // (#eval ...<expression>)
  ifdef:    "#ifdef",    // (#ifdef <identifier> ...<statement>)
  ifndef:   "#ifndef",   // (#ifndef <identifier> ...<statement>)
  if:       "#if",       // (#if (...<expression>) ...<statement>)
  include:  "#include",  // (#include [type] <filename>)
  size:     "#size",     // (#size <filename>)
};

/** @typedef {(string | List)[]} List */

/**
 * Preprocessor
 * @param {Object} options
 * @param {string} options.pathname - source file
 * @param {string} [options.root="/"] - root directory for resolving absolute paths of includes
 * @param {Map<string, string>} [options.definitions=Map()] - initial macro definitions
 * @param {Object<string, string>} [options.customDirectives={}] - custom directives keys
 * @returns {string} result
 */
export function preprocessor({
  pathname,
  root = "/",
  definitions = new Map(),
  customDirectives = {},
}) {
  const directives = {
    ...DIRECTIVES,
    ...customDirectives,
  };

  /**
   * Recursive files processing
   * @param {string} pathname
   * @param {string[]} [included=[]]
   * @returns {string}
   */
  function processFile(pathname, included = []) {
    included = [...included, pathname];
    const list = parse(readFileSync(pathname, { encoding: "utf8" }));

    /**
     * Resolve file pathname relative to the current file or root directory
     * @param {string} value
     * @returns {string}
     */
    function resolvePath(value) {
      // Removing quotes
      if (value[0] == '"') {
        value = value.slice(1, -1).replace(/\\"/g, '"');
      }
      return value[0] == "/"
        ? resolve(root, value.slice(1))
        : resolve(dirname(pathname), value);
    }

    /**
     * Recursive list processing
     * @param {List} list
     * @param {number} pos
     * @param {List | null} parent
     */
    function processList(list, pos, parent) {
      try {
        let [, first, , second, , third] = list;
        let insertStatementBlock = false;
        for (let i = 1; i < list.length; i += 2) {
          if (Array.isArray(list[i])) {
            processList(list[i], i, list);
            continue;
          }
          if (i == 1 && parent) {
            // -- Before processing elements

            // `eval`, `size` directives
            if (first === directives.eval || first === directives.size) {
              continue;
            }

            // `define`, `defined`, `undef` directives
            if (
              first === directives.define ||
              first === directives.defined ||
              first === directives.undef
            ) {
              i += 2;
              continue;
            }

            // `include` directive
            if (first === directives.include) {
              i += second === "data" ? 4 : 2;
              continue;
            }

            // `ifdef` directive
            if (first === directives.ifdef && typeof second == "string") {
              if (!definitions.has(second)) {
                parent[pos] = `(;${first} ${second} // false;)`;
                return;
              }
              insertStatementBlock = true;
              i += 2;
              continue;
            }

            // `ifndef` directive
            if (first === directives.ifndef && typeof second == "string") {
              if (definitions.has(second)) {
                parent[pos] = `(;${first} ${second} // false;)`;
                return;
              }
              insertStatementBlock = true;
              i += 2;
              continue;
            }

            // `if` directive
            if (first === directives.if && second) {
              if (Array.isArray(second)) {
                processList(second, 3, list);
                second = list[3];
              }
              const expression = Array.isArray(second)
                ? toString(second, false)
                : definitions.has(second)
                ? definitions.get(second)
                : second;
              if (!eval(expression)) {
                parent[pos] = `(;${first} (${expression}) // false;)`;
                return;
              }
              insertStatementBlock = true;
              i += 2;
              continue;
            }
          }

          // Replace macro
          if (definitions.has(list[i])) {
            list[i] = definitions.get(list[i]);
          }
        }
        if (insertStatementBlock) {
          parent[pos] = toString(list.slice(4)).trim();
          return;
        }

        // -- After processing elements
        if (!parent) {
          return;
        }

        // update values
        [, first, , second, , third] = list;

        const len = (list.length / 2) | 0;

        // `define` directive
        if (first === directives.define && typeof second == "string") {
          definitions.set(second, toString(list.slice(4)).trim());
          parent[pos] = `(;${first} ${second} ${toString(
            list.slice(4),
            false
          )};)`;
          return;
        }

        // `defined` directive
        if (
          first === directives.defined &&
          typeof second == "string" &&
          len == 2
        ) {
          definitions.has(second);
          parent[pos] = definitions.has(second) ? "1" : "0";
          return;
        }

        // `undef` directive
        if (
          first === directives.undef &&
          typeof second == "string" &&
          len == 2
        ) {
          definitions.delete(second);
          parent[pos] = `(;${first} ${second};)`;
          return;
        }

        // `eval` directive
        if (first === directives.eval) {
          parent[pos] = String(eval(toString(list.slice(2), false)));
          return;
        }

        // `size` directive
        if (
          first === directives.size &&
          typeof second == "string" &&
          len == 2
        ) {
          parent[pos] = readFileSync(resolvePath(second)).length.toString();
          return;
        }

        // `include data` directive
        if (
          first === directives.include &&
          second === "data" &&
          typeof third == "string" &&
          len == 3
        ) {
          const include = resolvePath(third);
          const buffer = readFileSync(include);
          let string = `;; ${include}\n"`;
          let i = 0;
          for (const byte of buffer) {
            if (i && i % 26 == 0) {
              string += '"\n"';
            }
            i++;
            string += `\\${byte.toString(16).padStart(2, 0)}`;
          }
          string += '"';
          parent[pos] = string;
          // Attempt to move to the beginning of the line
          parent[pos - 1] = parent[pos - 1].replace(/\n[ \t]+$/, "\n");
          return;
        }

        // `include` directive
        if (
          first === directives.include &&
          typeof second == "string" &&
          len == 2
        ) {
          const include = resolvePath(second);
          if (included.includes(include)) {
            throw new Error("Recursion detected");
          }
          parent[pos] = `;; ==== including ${include} ====\n${processFile(
            include,
            included
          ).trim()}\n;; ==== end of ${include} ====\n`;
          // Attempt to move to the beginning of the line
          parent[pos - 1] = parent[pos - 1].replace(/\n[ \t]+$/, "\n");
          return;
        }
      } catch (err) {
        if (err instanceof PreprocessorError && err.pathname == pathname) {
          throw err;
        }
        throw new PreprocessorError(err.message, list, pathname);
      }
    }

    processList(list, 0, null);
    return toString(list);
  }

  const result = processFile(pathname);
  return result;
}

/**
 * Parse WebAssembly S-expressions-like text
 * @param {string} source
 * @returns {List}
 */
function parse(source) {
  const length = source.length;
  let pos = 0;

  function readBlockComment() {
    let comment = "";
    while (pos < length) {
      const char = source[pos++];
      const next = source[pos];
      comment += char;
      if (char == ";" && next == ")") {
        comment += next;
        pos++;
        break;
      }
    }
    return comment;
  }

  function readLineComment() {
    let comment = "";
    while (pos < length) {
      const char = source[pos++];
      comment += char;
      if (char == "\n") {
        break;
      }
    }
    return comment;
  }

  function readString() {
    let string = "";
    while (pos < length) {
      const char = source[pos++];
      const next = source[pos];
      string += char;
      if (char == "\\" && next == '"') {
        string += next;
        pos++;
        continue;
      }
      if (char == '"') {
        break;
      }
    }
    return string;
  }

  function readList() {
    const list = [];
    let word = "";
    let space = "";
    while (pos < length) {
      const char = source[pos++];
      const next = source[pos];
      if (/\s/.test(char)) {
        word && (list.push(word), (word = ""));
        space += char;
        continue;
      }
      if (char == "(" && next == ";") {
        word && (list.push(word), (word = ""));
        pos++;
        space += char + next + readBlockComment();
        continue;
      }
      if (char == ";" && next == ";") {
        word && (list.push(word), (word = ""));
        pos++;
        space += char + next + readLineComment();
        continue;
      }
      if (char == '"') {
        word && (list.push(word), (word = ""));
        list.push(space), (space = "");
        word += char + readString();
        continue;
      }
      if (char == "(") {
        word && (list.push(word), (word = ""));
        list.push(space), (space = "");
        list.push(readList());
        continue;
      }
      if (char == ")") {
        break;
      }
      word || (list.push(space), (space = ""));
      word += char;
    }
    word && list.push(word);
    list.push(space);
    return list;
  }

  return readList();
}

/**
 * Convert back to a string parsed S-expressins-like text
 * @param {List} list
 * @param {boolean} [useOriginalSpace=true]
 * @returns {string}
 */
function toString(list, useOriginalSpace = true) {
  return list
    .filter((item, i) => useOriginalSpace || i % 2)
    .map((item) =>
      Array.isArray(item) ? `(${toString(item, useOriginalSpace)})` : item
    )
    .join(useOriginalSpace ? "" : " ");
}

/**
 * Custom preprocessor error
 */
export class PreprocessorError extends Error {
  /**
   * @param {string} message
   * @param {List} list
   * @param {string} pathname
   */
  constructor(message, list, pathname) {
    super(`(${toString(list, false)}) >> ${message}\nat "${pathname}"`);
    this.name = this.constructor.name;
    this.list = list;
    this.pathname = pathname;
  }
}

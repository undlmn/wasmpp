/**
 * Parse S-expressions
 * @param {string} src
 * @returns {Cons|null}
 */
export function parse(src) {
  const length = src.length;
  let pos = 0;
  return readList();

  function readList(nested = false) {
    let list = null;
    let tail = null;
    let buffer = "";
    let bufferType = "";
    function flush() {
      if (buffer) {
        const c = cons(buffer);
        list ? (tail = tail.y = c) : (list = tail = c);
      }
      buffer = "";
      bufferType = "";
    }

    while (pos < length) {
      const char = src[pos++];
      const next = src[pos];

      if (char == "(" && next == ";") {
        flush();
        buffer = char + next;
        pos++;
        while (pos < length) {
          const char = src[pos++];
          const next = src[pos];
          buffer += char;
          if (char == ";" && next == ")") {
            buffer += next;
            pos++;
            flush();
            break;
          }
        }
        if (buffer) {
          throw new Error(
            "Unexpected end of the contents - the block-comment is not closed"
          );
        }
        continue;
      }

      if (char == ";" && next == ";") {
        flush();
        buffer = char + next;
        pos++;
        while (pos < length) {
          const char = src[pos++];
          buffer += char;
          if (char == "\n") {
            break;
          }
        }
        flush();
        continue;
      }

      if (char == '"') {
        flush();
        buffer = char;
        while (pos < length) {
          const char = src[pos++];
          const next = src[pos];
          buffer += char;
          if (char == "\\" && next == '"') {
            buffer += next;
            pos++;
            continue;
          }
          if (char == '"') {
            flush();
            break;
          }
        }
        if (buffer) {
          throw new Error(
            "Unexpected end of the contents - the quoted string is not closed"
          );
        }
        continue;
      }

      if (char == "(") {
        flush();
        const c = cons(readList(true));
        list ? (tail = tail.y = c) : (list = tail = c);
        continue;
      }

      if (char == ")") {
        if (!nested) {
          const lines = src.slice(0, pos).split(/\n/);
          const err = new Error("Unexpected closure of a non-existent list");
          err.at = `${lines.length}:${lines[lines.length - 1].length}`;
          throw err;
        }
        flush();
        return list;
      }

      if (/\s/.test(char)) {
        if (bufferType != "space") {
          flush();
          bufferType = "space";
        }
      } else {
        if (bufferType != "symbol") {
          flush();
          bufferType = "symbol";
        }
      }
      buffer += char;
    }
    if (nested) {
      throw new Error(
        "Unexpected end of the contents - the list is not closed"
      );
    }
    flush();
    return list;
  }
}

/**
 * Create cons pair
 * @param {Cons|string|null} x - atom
 * @param {Cons|null} y - next
 * @returns {Cons}
 */
export function cons(x, y = null) {
  const c = new Cons();
  c.x = x;
  c.y = y;
  return c;
}

/**
 * Сhecking whether the value is a сons pair
 * @param {*} value
 * @returns {boolean}
 */
export function isCons(value) {
  return value instanceof Cons;
}

class Cons {
  #x = null;
  #y = null;

  get x() {
    return this.#x;
  }

  set x(value) {
    if (value !== null && typeof value != "string" && !isCons(value)) {
      throw new TypeError("X value can be an cons pair, a string, or null");
    }
    this.#x = value;
  }

  get y() {
    return this.#y;
  }

  set y(value) {
    if (value !== null && !isCons(value)) {
      throw new TypeError("Y value can be an cons pair or null");
    }
    this.#y = value;
  }

  /**
   * Returns atom type
   * @returns {string}
   */
  get type() {
    if (this.#x == null) return "empty";
    if (isCons(this.#x)) return "list";
    if (typeof this.#x == "string") {
      if (this.#x.startsWith("(;")) return "blockComment";
      if (this.#x.startsWith(";;")) return "lineComment";
      if (this.#x.startsWith('"')) return "string";
      if (/^\s*$/.test(this.#x)) return "space";
      return "symbol";
    }
    return "unknown";
  }

  /**
   * Returns the last cons pair in the list
   * @returns {Cons}
   */
  get tail() {
    let a = this;
    while (a.y) {
      a = a.y;
    }
    return a;
  }

  /** Returns the nearest element
   * @returns {Cons|null}
   */
  get element() {
    let a = this;
    while (a) {
      const type = a.type;
      if (type != "space" && type != "blockComment" && type != "lineComment") {
        break;
      }
      a = a.y;
    }
    return a;
  }

  [Symbol.for("nodejs.util.inspect.custom")](depth, opts, inspect) {
    opts = {
      ...opts,
      ...(opts.depth == null ? {} : { depth: opts.depth - 1 }),
    };
    return depth < 0
      ? "(...)"
      : `(${inspect(this.#x, opts)} ${inspect(this.#y, opts)})`;
  }

  toString({ comments = true, spaces = true, _previousType = "none" } = {}) {
    const type = this.type;
    let str = "";
    if (type == "empty") {
      str += "()";
      _previousType = type;
    } else if (type == "list") {
      str += `(${this.#x.toString({ comments, spaces })})`;
      _previousType = type;
    } else if (
      (comments || (type != "blockComment" && type != "lineComment")) &&
      (spaces || type != "space")
    ) {
      if (
        (_previousType == "symbol" || _previousType == "string") &&
        (type == "symbol" || type == "string")
      ) {
        str += " ";
      }
      str += this.#x;
      _previousType = type;
    }
    if (
      !comments &&
      spaces &&
      type == "lineComment" &&
      this.#x.endsWith("\n")
    ) {
      str += "\n";
    }
    if (this.#y) {
      str += this.#y.toString({ comments, spaces, _previousType });
    }
    return str;
  }

  /**
   * Deep copying a part of the list
   * @param {Cons|null} stop
   * @returns {Cons|null}
   */
  copy(stop = null) {
    let list = null;
    let tail = null;
    for (let src = this; src != stop; src = src.y) {
      const c = cons(src.type == "list" ? src.x.copy() : src.x);
      list ? (tail = tail.y = c) : (list = tail = c);
    }
    return list;
  }

  /**
   * Removes whitespace from both ends of this list and returns a new list,
   * without modifying the original list.
   * @returns {Cons|null}
   */
  trim() {
    let left = this;
    while (left && left.type == "space") {
      left = left.y;
    }
    const st = [];
    let a = left;
    while (a) {
      st.push(a);
      a = a.y;
    }
    let right = null;
    while (st.length) {
      a = st.pop();
      if (a.type != "space") {
        break;
      }
      right = a;
    }
    return left ? left.copy(right) : null;
  }
}

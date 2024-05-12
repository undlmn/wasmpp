# WebAssembly Text Preprocessor

This is the macro preprocessor for WebAssembly text language similar to the C preprocessor with some limitations and additions. The preprocessor provides inclusion `wat` and any data files, macro expansions, conditional compilation, and more.

```wasm
(module
  (memory 1)

  (#include "lib/utils.wat")

  (#define DATA_BOTTOM 256)

  (global $ptrCounter (mut i32) (i32.const (#eval DATA_BOTTOM + (#size "text.txt"))))

  (func $count
    (i32.store
      (global.get $ptrCounter)
      (i32.add
        (i32.load (global.get $ptrCounter))
        (i32.const 1)
      )
    )
    (#ifdef DEBUG
      (#ifndef SILENT call $log)
    )
  )

  (data (i32.const DATA_BOTTOM)
    (#include data text.txt)
  )

  (export "count" (func $count))
)
```

See another complete [example](https://github.com/undlmn/wasmpp/tree/main/example) for more details.

## CLI

#### Install

```sh
npm install --global wasmpp
```

#### Usage

```
wasmpp <file> [options]
```

#### Options

```
  -h --help            Show this information
  --version            Show version
  -o FILE, --out=FILE  Write output to FILE
  -r DIR, --root=DIR   Root directory for resolving absolute paths of includes
  -D <macro>=<value>   Define <macro> to <value> (or empty string if <value> omitted)
```

#### Example

```sh
wasmpp src/main.wat -o build/app.wat -D DEBUG && wat2wasm build/app.wat -o build/app.wasm
```

( \* to create `wasm` file, you need to install [wabt](https://github.com/WebAssembly/wabt) or [wabt port](https://www.npmjs.com/package/wabt) for node and web)

## API

#### Install

```sh
npm install wasmpp
```

#### Usage

```js
import { preprocessor } from "wasmpp";

const result = preprocessor({
  pathname: "src/main.wat",                // {string} - source file
  root: "src",                             // {string} (optional) - root directory for resolving absolute paths of includes (default: system root)
  definitions: new Map([["A", "1"]]),      // {Map<string,string>} (optional) - initial macro definitions
  customDirectives: { size: "#filesize" }, // {Object<string,string>} (optional) - custom directives keys
});
```

## Preprocessor Directives

### Macro definition

**`(#define <identifier> ...<replacement>)`**

Whenever the `identifier` appears in the source code it is replaced with the `replacement`, which can be empty.

Macros were conventionally used as part of good programming practice to create symbolic names for constants; for example:

```
(#define PI 3.14159)
```

instead of hard-coding numbers throughout the code.

A macro definition can be removed with `#undef`:

**`(#undef <identifier>)`**

### Conditional compilation

**`(#ifdef <identifier> ...<statement>)`** - if defined

**`(#ifndef <identifier> ...<statement>)`** - if not defined

Checking the definition exists.

**`(#if (...<expression>) ...<statement>)`**

Checking the `expression` returns a _truthy_ value. The `expression` can be any valid JavaScript expression.

**`(#defined <identifier>)`**

Replaced by **1** if the definition exists, otherwise by **0**.

`(#ifdef <identifier> ...)` and `(#if (#defined <identifier>) ...)` is the same thing,
as well `(#ifndef <identifier> ...)` and `(#if (!(#defined <identifier>)) ...)`, but you can do something like this, for example: `(#if ((#defined SOMETHING) && (#defined SOMETHING_ELSE)) ...)`

### Evaluate expresions

**`(#eval ...<expression>)`**

Evaluates JavaScript expresion and returns its completion value. It is indispensable if you need to calculate something. For example:

```
f64.const (#eval Math.PI * 2 * SOMETHING)
```

### Including files

**`(#include <filename>)`**

The preprocessor replaces the `(#include <filename>)` with the textual content of the file. Before each inclusion, the file is processed by the preprocessor.

**`(#include data <filename>)`**

Replaced with content of the file as a string. Specifically for the data section.

**`(#size <filename>)`**

When you include a data file, you may need to know the size of the data. This directive is replaced by the size of the corresponding file.

## License

[MIT](https://github.com/undlmn/wasmpp/blob/main/LICENSE)

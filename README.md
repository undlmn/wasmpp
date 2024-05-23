# WebAssembly Text Preprocessor

This is the macro preprocessor for WebAssembly text language similar to the C preprocessor with some limitations and additions. The preprocessor provides inclusion `wat` and any data files, macro expansions, conditional compilation, and more.

```wasm
(module
  (memory 1)

  (#include "lib/utils.wat")

  (#define DATA_BOTTOM 256)
  (#define COUNTER i32.const (#eval DATA_BOTTOM + (#size "text.txt")))

  (func $count
    (i32.store
      COUNTER
      (i32.add
        (i32.load COUNTER)
        i32.const 1
      )
    )
    (#ifdef DEBUG call $log)
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
  --no-comments        Remove all comments
  --compress           Remove all unnecessary spaces
```

#### Example

```sh
wasmpp src/main.wat -o build/app.wat -D DEBUG && wat2wasm build/app.wat -o build/app.wasm
```

( \* to create `wasm` file, you need to install [wabt](https://github.com/WebAssembly/wabt) or analogues)

## API

#### Install

```sh
npm install wasmpp
```

#### Usage

```js
import { preprocessor } from "wasmpp";

const result = preprocessor({
  source: "(module)",        // {string} (optional) -  the source code (by default, it is read from a file)
  pathname: "src/main.wat",  // {string} - the path to the source file
  root: "src",               // {string} (optional) - the root directory for resolving the absolute paths to the inclusions
  macros: ["A 1", "B"],      // {string[]} (optional) - initial macros definitions "<identifier> ...<replacement>"
  comments: true,            // {boolean} (optional) - leave all comments (default true)
  spaces: true,              // {boolean} (optionsl) - leave all spaces (default true)
  directives: null           // {Object<string,function>} - custom extra directives
});
```

## Preprocessor Directives

### Macro definition

**`(#define <identifier> ...<replacement>)`**

**`(#define (identifier ...<parameters>) ...<replacement>)`**

There are two types of macros: object-like and function-like. Object-like macros do not take parameters; function-like macros do (although the list of parameters may be empty).

A macro definition can be removed with `#undef`:

**`(#undef <identifier>)`**

Whenever the `identifier` appears in the source code it is replaced with the `replacement`, which can be empty.

Object-like macros were conventionally used as part of good programming practice to create symbolic names for constants; for example:

```
(#define PI 3.14159)
```

instead of hard-coding numbers throughout the code.

An example of a function-like macro is:

```
(#define (CONST_32 x) i32.const x)
```

The expression `(CONST_32 42)` will be replaced by `i32.const 42`.

In combination with the `#eval` and other directives, you can create function-like macros with unlimited functionality.

```
(#define (RAD2DEG rad) (#eval rad * 180 / Math.PI ))

f64.const (RAD2DEG 1)
```

```
(#ifndef TOP (#define TOP 0))
(#define (SAVE value)
  (i32.store (i32.const TOP) (i32.const value))
  (#define TOP (#eval TOP + 4))
)

(SAVE 42)
```

And `#eval` also has access to the `globalThis` (or `global`) object where it can save variables and functions...

```
(#eval global.top = 0; "")
(#define (SAVE value)
  (i32.store (i32.const (#eval let a=top;top+=4;a)) (i32.const value))
)
```

### Conditional compilation

**`(#ifdef <identifier> ...<statement>)`** - if defined

**`(#ifndef <identifier> ...<statement>)`** - if not defined

Checking the definition exists.

**`(#if (...<expression>) ...<statement>)`**

Checking the `expression` returns a _truthy_ value. The `expression` can be any valid JavaScript expression.

**`(#defined <identifier>)`**

Replaced by **1** if the definition exists, otherwise by **0**.

`(#ifdef <identifier> ...)` and `(#if ((#defined <identifier>)) ...)` is the same thing,
as well `(#ifndef <identifier> ...)` and `(#if (!(#defined <identifier>)) ...)`, but you can do something like this, for example: `(#if ((#defined SOMETHING) && (#defined SOMETHING_ELSE)) ...)`

### Evaluate expresions

**`(#eval ...<expression>)`**

Evaluates JavaScript expresion and returns its completion value. It is indispensable if you need to calculate something. For example:

```
f64.const (#eval Math.PI * 2 * SOMETHING)
```

### Including files

**`(#include <filepath>)`**

The preprocessor replaces the `(#include <filepath>)` with the textual content of the file. Before each inclusion, the file is processed by the preprocessor.

**`(#include data <filepath>)`**

Replaced with content of the file as a string. Specifically for the data section.

**`(#size <filepath>)`**

When you include a data file, you may need to know the size of the data. This directive is replaced by the size of the corresponding file.

## License

[MIT](https://github.com/undlmn/wasmpp/blob/main/LICENSE)

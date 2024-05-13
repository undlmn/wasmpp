#!/usr/bin/env node

/**
 * WebAssembly Text Preprocessor
 * Command-line interface
 * by undlmn 2024
 */

import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";
import { preprocessor } from "./wasmpp.js";

const { name, version, description } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url))
);

const USAGE = `
Usage:
  ${name} <file> [options]
  ${name} -h | --help
  ${name} --version

Options:
  -h --help            Show this screen
  --version            Show version
  -o FILE, --out=FILE  Write output to FILE
  -r DIR, --root=DIR   Root directory for resolving absolute paths of includes
  -D <macro>=<value>   Define <macro> to <value> (or empty string if <value> omitted)
`;
// How to write Usage correctly: http://docopt.org
// And extra bedtime reading: https://clig.dev

try {
  const { pathname, root, out, definitions } = parseArgs();
  const result = preprocessor({ pathname, root, definitions });

  if (out) {
    writeFileSync(out, result);
  } else {
    console.log(result);
  }
} catch (err) {
  console.error(err.toString());
  exit(1);
}

/**
 * Parsing command line arguments
 * @returns {{
 *   pathname: string,
 *   root: string,
 *   out: (string | null),
 *   definitions: Map<string, string>
 * }}
 */
function parseArgs() {
  let pathname = "";
  let root = "/";
  let out = null;
  const definitions = new Map();

  try {
    for (let i = 2; i < argv.length; i++) {
      if (argv[i] == "-h" || argv[i] == "--help") {
        console.log(description);
        console.log(USAGE);
        exit(0);
      }
      if (argv[i] == "--version") {
        console.log(version);
        exit(0);
      }
      if (argv[i] == "-r") {
        if (i + 1 == argv.length) {
          throw new Error("The root directory is not specified");
        }
        root = argv[i + 1];
        i += 1;
        continue;
      }
      if (argv[i].startsWith("--root=")) {
        root = argv[i].slice(7);
        continue;
      }
      if (argv[i] == "-o") {
        out = argv[i + 1];
        i += 1;
        continue;
      }
      if (argv[i].startsWith == "--out=") {
        out = argv[i].slice(6);
        continue;
      }
      if (argv[i] == "-D") {
        if (i + 1 == argv.length) {
          throw new Error("The definition of the macro is not specified");
        }
        const [key, value = "1"] = argv[i + 1].split(/=(.*)/);
        definitions.set(key, value);
        i += 1;
        continue;
      }
      if (argv[i].startsWith("-")) {
        throw new Error(`Unrecognized option: ${argv[i]}`);
      }
      if (!pathname) {
        pathname = argv[i];
        continue;
      } else {
        throw new Error("Too many arguments");
      }
    }
    if (!pathname) {
      throw new Error("An input file is required");
    }
  } catch (err) {
    // Colors and formatting:
    // https://misc.flogisoft.com/bash/tip_colors_and_formatting
    // Keep stderr clean without any colors
    stdout.write("\x1b[1;31m");
    console.error(err.message);
    stdout.write("\x1b[0m");
    console.log(USAGE);
    exit(1);
  }

  pathname = resolve(pathname);
  root = resolve(root);
  out = out && resolve(out);

  return { pathname, root, out, definitions };
}

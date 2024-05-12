(module
  (memory 1)
  (global $answer (mut i32) (i32.const 0))

  (;#define NUM 26;)
  (;#define PIC_FILE_SIZE 104;)
  (;#define PI 3.141592653589793;) ;; Math.PI is js expression
  (;#define MY_F32CONST f32.const 26;)
  (;#define NUM -29;)
  (;#define DATA_START 64;)

  (;#define NOPS nop nop nop;)

  ;; (-29 / 6 != 7) is js expression
;; ==== including /app/example/src/awesome-lib.wat ====
(;#define AWESOME_LIB ;)

(func $awelibGet11 (result i32)
  i32.const 11
)
;; ==== end of /app/example/src/awesome-lib.wat ====

  (func $main
    (;#ifdef ERR // false;) ;; try to run wasmpp with -D ERR
    f32.const -29
    f32.const 26 (;With comment;)
    f32.add
    f32.const 53
    f32.add
    call $awelibGet11
    f32.convert_i32_s
    f32.sub
    f32.const 3.141592653589793
    f32.add
    nop nop
    nop
    i32.trunc_f32_s
    global.set $answer
  )

  (func $getAnswer (result i32 i32)
    i32.const 168
    global.get $answer
  )

  (data (i32.const 64)
;; /app/example/src/pic.png
"\89\50\4e\47\0d\0a\1a\0a\00\00\00\0d\49\48\44\52\00\00\00\04\00\00\00\04\08\03"
"\00\00\00\9e\2f\6e\4c\00\00\00\01\73\52\47\42\00\ae\ce\1c\e9\00\00\00\06\50\4c"
"\54\45\00\00\00\ff\ff\ff\a5\d9\9f\dd\00\00\00\10\49\44\41\54\08\99\63\60\00\03"
"\46\46\18\01\04\00\00\3c\00\05\93\97\5d\36\00\00\00\00\49\45\4e\44\ae\42\60\82"
;; /app/example/src/text.txt
"\54\68\65\20\41\6e\73\77\65\72\20\74\6f\20\74\68\65\20\55\6c\74\69\6d\61\74\65"
"\20\51\75\65\73\74\69\6f\6e\20\6f\66\20\4c\69\66\65\2c\20\74\68\65\20\55\6e\69"
"\76\65\72\73\65\2c\20\61\6e\64\20\45\76\65\72\79\74\68\69\6e\67\20\69\73"
    "\00"
  )

  (;#undef NUM;)

  (start $main)

  (export "memory" (memory 0))
  (export "getAnswer" (func $getAnswer))
)

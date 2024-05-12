(module
  (memory 1)
  (global $answer (mut i32) (i32.const 0))

  (#define NUM 26)
  (#define PIC_FILE_SIZE (#size "pic.png"))
  (#define PI (#eval Math.PI)) ;; Math.PI is js expression
  (#define MY_F32CONST f32.const NUM (;With comment;))
  (#define NUM -29)
  (#define DATA_START 64)

  (#define NOPS
    nop nop
    nop
  )

  (#if (NUM / 6 != 7) ;; (-29 / 6 != 7) is js expression
    (#include "/src/awesome-lib.wat")
  )

  (func $main
    (#ifdef ERR unreachable) ;; try to run wasmpp with -D ERR
    f32.const NUM
    MY_F32CONST
    f32.add
    f32.const (#eval 1 + (#defined FF) + (#size /src/pic.png) / 2)
    f32.add
    ( ;; Conditional compilation
    #ifdef AWESOME_LIB
    call $awelibGet11
    f32.convert_i32_s
    f32.sub
    )
    f32.const PI
    f32.add
    (#ifdef NOPS NOPS)
    i32.trunc_f32_s
    global.set $answer
  )

  (func $getAnswer (result i32 i32)
    i32.const (#eval DATA_START + PIC_FILE_SIZE)
    global.get $answer
  )

  (data (i32.const DATA_START)
    (#include data "pic.png")
    (#include data text.txt)
    "\00"
  )

  (#undef NUM)

  (#if (!(#defined NUM))
    (#ifndef NUM
      (start $main)
    )
  )

  (export "memory" (memory 0))
  (export "getAnswer" (func $getAnswer))
)

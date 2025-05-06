section .text
    call Main$main
    mov eax, 1
    mov ebx, 0
    int 0x80

malloc:
    push ebp
    mov ebp, esp
    push ebx

    mov eax, 0x1000
    mov ebx, [ebp + 8]
    int 0x80

    pop ebx
    mov esp, ebp
    pop ebp
    ret

newarray:
    push ebp
    mov ebp, esp

    # parms are dims in reverse order, then # of dims
    push [ebp + 8] # pass # of dims
    lea eax, [ebp + 12]  # and ptr to dims
    push eax
    call newarray_recurse

    mov esp, ebp
    pop ebp
    ret

# parms are # of dims and ptr to dims
newarray_recurse:
    push ebp
    mov ebp, esp
    push ebx
    push edi
    push esi

    # allocate this level array
    mov eax, [ebp + 8]
    mov eax, [eax]
    mov ebx, eax
    add eax, 1
    imul eax, 4
    push eax
    call malloc
    add esp, 4
    mov [eax], ebx

    # last level?
    mov edi, [ebp + 12]
    cmp edi, 1
    je newarray_recurse_epilogue

    # create subarrays - ebx this array, ecx counter, edi num dims, esi ptr to dims
    mov ecx, [ebp + 8]
    mov ecx, [ecx]
    mov ebx, eax
    sub edi, 1
    mov esi, [ebp + 8]
    add esi, 4

loop:
    cmp ecx, 0
    je loop_end

    sub ecx, 1
    push ecx
    push edi
    push esi
    call newarray_recurse
    add esp, 8
    pop ecx
    mov [ebx + ecx*4 + 4], eax
    jmp loop

loop_end:
    mov eax, ebx

newarray_recurse_epilogue:
    pop esi
    pop edi
    pop ebx
    mov esp, ebp
    pop ebp
    ret

Object$init:
    ret
Object$toString:
    push 17
    int 0x80
Object$hashCode:
    push 17
    int 0x80

section .data

C1$$class:
    dd C1$$vtable
    dd C1$$itable

C1$$vtable:
    dd Object$toString
    dd Object$hashCode
    dd C1$baz
    dd C1$foo
    dd C1$bar

C1$$itable$$I1:
    dd C1$foo
    dd C1$bar

C1$$itable$$I2:
    dd C1$baz
    dd C1$bar

C1$$itable:
    dd 8, C1$$itable$$I1
    dd 9, C1$$itable$$I2

section .text

C1$init:
    push ebp
    mov ebp, esp

    push [ebp + 8]
    call Object$init
    add esp, 4
    push eax

C1$init$$epilogue:
    pop eax
    mov esp, ebp
    pop ebp
    ret

C1$baz:
    push ebp
    mov ebp, esp

    push 2

C1$baz$$epilogue:
    pop eax
    mov esp, ebp
    pop ebp
    ret

C1$foo:
    push ebp
    mov ebp, esp

    push 1

C1$foo$$epilogue:
    pop eax
    mov esp, ebp
    pop ebp
    ret

C1$bar:
    push ebp
    mov ebp, esp

    push 3

C1$bar$$epilogue:
    pop eax
    mov esp, ebp
    pop ebp
    ret

Main$main:
    push ebp
    mov ebp, esp
    sub esp, 40

    push 4
    call malloc
    add esp, 4
    lea ebx, [C1$$class]
    mov [eax], ebx
    push eax
    call C1$init
    add esp, 4
    push eax
    pop [ebp - 4]
    push [ebp - 4]
    mov eax, [esp]
    mov eax, [eax]
    mov eax, [eax]
    call [eax + 12]
    add esp, 4
    push eax
    pop [ebp - 8]
    push [ebp - 4]
    mov eax, [esp]
    mov eax, [eax]
    mov eax, [eax]
    call [eax + 16]
    add esp, 4
    push eax
    pop [ebp - 12]
    push [ebp - 4]
    mov eax, [esp]
    mov eax, [eax]
    mov eax, [eax]
    call [eax + 8]
    add esp, 4
    push eax
    pop [ebp - 16]
    push [ebp - 4]
    pop [ebp - 20]
    push [ebp - 20]
    mov eax, [esp]
    mov eax, [eax]
    mov eax, [eax + 4]
    push eax
    push 8
    push 0
    push 1
    call itable_invoke
    add esp, 12
    push eax
    pop [ebp - 24]
    push [ebp - 20]
    mov eax, [esp]
    mov eax, [eax]
    mov eax, [eax + 4]
    push eax
    push 8
    push 1
    push 1
    call itable_invoke
    add esp, 12
    push eax
    pop [ebp - 28]
    push [ebp - 4]
    pop [ebp - 32]
    push [ebp - 32]
    mov eax, [esp]
    mov eax, [eax]
    mov eax, [eax + 4]
    push eax
    push 9
    push 1
    push 1
    call itable_invoke
    add esp, 12
    push eax
    pop [ebp - 36]
    push [ebp - 32]
    mov eax, [esp]
    mov eax, [eax]
    mov eax, [eax + 4]
    push eax
    push 9
    push 0
    push 1
    call itable_invoke
    add esp, 12
    push eax
    pop [ebp - 40]

Main$main$$epilogue:
    mov esp, ebp
    pop ebp
    ret



itable_invoke:
    push ebp
    mov ebp, esp

    mov eax, [ebp + 16] # interface id
    mov ebx, [ebp + 20] # itable
    mov ecx, 0
check_next_itable_entry:
    cmp [ebx + ecx*8], eax
    je found_itable_entry
    add ecx, 1
    jmp check_next_itable_entry
found_itable_entry:
    mov ebx, [ebx + ecx*8 + 4] # itable for interface

    mov ecx, [ebp + 8]
copy_params_loop:
    cmp ecx, 0
    je copy_params_done
    push [ebp + ecx*4 + 20]
    sub ecx, 1
    jmp copy_params_loop

copy_params_done:
    mov ecx, [ebp + 12] # method index
    call [ebx + ecx * 4]

    mov esp, ebp
    pop ebp
    ret

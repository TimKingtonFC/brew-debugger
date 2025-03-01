    call Main_main
    mov eax, 1
    mov ebx, 0
    int 0x80

Main_factorial:
    push ebp
    mov ebp, esp

    push [ebp + 8]
    push 1
    pop ebx
    pop eax
    cmp eax, ebx
    jg Main_factorial_5
    push 1
    jmp Main_factorial_epilogue
Main_factorial_5:
    push [ebp + 8]
    push [ebp + 8]
    push 1
    pop ebx
    pop eax
    sub eax, ebx
    push eax
    call Main_factorial
    add esp, 4
    push eax
    pop ebx
    pop eax
    imul eax, ebx
    push eax

Main_factorial_epilogue:
    pop eax
    mov esp, ebp
    pop ebp
    ret

Main_main:
    push ebp
    mov ebp, esp
    sub esp, 8

    push 3
    call Main_factorial
    add esp, 4
    push eax
    push 4
    call Main_factorial
    add esp, 4
    push eax
    pop [ebp - 8]
    pop [ebp - 4]

Main_main_epilogue:
    mov esp, ebp
    pop ebp
    ret

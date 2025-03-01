
    push 10
    push 1
    call newarray

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

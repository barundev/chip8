describe('CPU tests', async () => {
  const { CPU } = require('../classes/CPU')
  const { MockCpuInterface } = require('../classes/interfaces/MockCpuInterface')
  const cpuInterface = new MockCpuInterface()
  const cpu = new CPU(cpuInterface)

  test('CPU should not execute after halting', async () => {
    cpu.load({ data: 0x0000 })
    cpu.halted = true

    let error
    try {
      await cpu.step()
    } catch (e) {
      error = e
    }

    // BSOD on halted program
    expect(error).toEqual(
      new Error(
        'A problem has been detected and Chip-8 has been shut down to prevent damage to your computer.'
      )
    )
  })

  // test.skip('2: CLS', () => {})

  test('3: RET (00ee) - Program counter should be set to stack pointer, then decrement stack pointer', async () => {
    cpu.load({ data: [0x00ee] })
    cpu.SP = 0x2
    cpu.stack[0x2] = 0xf
    await cpu.step()

    expect(cpu.PC).toBe(0xf)
    expect(cpu.SP).toBe(0x1)
  })

  test('3: RET (00ee) - CPU should halt if stack pointer is set to 0', async () => {
    cpu.load({ data: [0x00ee] })

    let error
    try {
      await cpu.step()
    } catch (e) {
      error = e
    }

    // BSOD on halted program
    expect(error).toEqual(new Error('Stack underflow.'))
  })

  test('4: JP_ADDR (1nnn) - Program counter should be set to address in argument', async () => {
    cpu.load({ data: [0x1333] })
    await cpu.step()

    expect(cpu.PC).toBe(0x333)
  })

  test('5: CALL_ADDR (2nnn) - Stack pointer should increment, program counter should be set to address in argument', async () => {
    cpu.load({ data: [0x2062] })
    // Set PC to retain original value
    const PC = cpu.PC
    await cpu.step()

    expect(cpu.SP).toBe(0)
    expect(cpu.stack[cpu.SP]).toBe(PC + 2)
    expect(cpu.PC).toBe(0x062)
  })

  test('5: CALL_ADDR (2nnn) - CPU should halt if stack pointer is set to 15', async () => {
    cpu.load({ data: [0x2062] })
    cpu.SP = 15

    let error
    try {
      await cpu.step()
    } catch (e) {
      error = e
    }

    // BSOD on halted program
    expect(error).toEqual(new Error('Stack overflow.'))
  })

  test('6: SE_VX_NN (3xnn) - Program counter should increment by two bytes if register x is not equal to nn argument', async () => {
    cpu.load({ data: [0x3abb] })
    await cpu.step()

    expect(cpu.PC).toBe(0x202)
  })

  test('6: SE_VX_NN (3xnn) - Program counter should increment by four bytes if register x is equal to nn argument', async () => {
    cpu.load({ data: [0x3abb] })
    cpu.registers[0xa] = 0xbb
    await cpu.step()

    expect(cpu.PC).toBe(0x204)
  })

  test('7: SNE_VX_NN (4xnn) - Program counter should increment by four bytes if register x is not equal to nn argument', async () => {
    cpu.load({ data: [0x4acc] })
    await cpu.step()

    expect(cpu.PC).toBe(0x204)
  })

  test('7: SNE_VX_NN (4xnn) - Program counter should increment by two bytes if register x is equal to nn argument', async () => {
    cpu.load({ data: [0x4acc] })
    cpu.registers[0xa] = 0xcc
    await cpu.step()

    expect(cpu.PC).toBe(0x202)
  })

  test('8: SE_VX_VY (5xy0) - Program counter should increment by four if register x is equal to register y', async () => {
    cpu.load({ data: [0x5ab0] })
    cpu.registers[0xa] = 0x5
    cpu.registers[0xb] = 0x5
    await cpu.step()

    expect(cpu.PC).toBe(0x204)
  })

  test('8: SE_VX_VY (5xy0) - Program counter should increment by two if register x is not equal to register y', async () => {
    cpu.load({ data: [0x5ab0] })
    cpu.registers[0xa] = 0x5
    cpu.registers[0xa] = 0x6
    await cpu.step()

    expect(cpu.PC).toBe(0x202)
  })

  test('9: LD_VX_NN (6xnn) - Register x should be set to the value of argument nn', async () => {
    cpu.load({ data: [0x6abb] })
    cpu.registers[0xa] = 0x10
    await cpu.step()

    expect(cpu.registers[0xa]).toBe(0xbb)
  })

  test('10: ADD_VX_NN (7xnn) - Register x should be set to the value of register x plus argument nn', async () => {
    cpu.load({ data: [0x7abb] })
    cpu.registers[0xa] = 0x10
    await cpu.step()

    expect(cpu.registers[0xa]).toBe(0x10 + 0xbb)
  })

  test('11: LD_VX_VY (8xy0) - Register x should be set to the value of register y', async () => {
    cpu.load({ data: [0x8ab0] })
    cpu.registers[0xb] = 0x8
    await cpu.step()

    expect(cpu.registers[0xa]).toBe(0x8)
  })

  test('12: OR_VX_VY (8xy1) - Register x should be set to the value of register x OR register y', async () => {
    cpu.load({ data: [0x8ab1] })
    cpu.registers[0xa] = 0x3
    cpu.registers[0xb] = 0x4
    await cpu.step()

    expect(0x3 | 0x4).toBe(0x7)
    expect(cpu.registers[0xa]).toBe(0x7)
  })

  test('13: AND_VX_VY (8xy2) - Register x should be set to the value of register x AND register y', async () => {
    cpu.load({ data: [0x8ab2] })
    cpu.registers[0xa] = 0x3
    cpu.registers[0xb] = 0x4
    await cpu.step()

    expect(0x3 & 0x4).toBe(0)
    expect(cpu.registers[0xa]).toBe(0)
  })

  test('14: XOR_VX_VY (8xy3) - Register x should be set to the value of register x XOR register y', async () => {
    cpu.load({ data: [0x8ab3] })
    cpu.registers[0xa] = 0x3
    cpu.registers[0xb] = 0x3
    await cpu.step()

    expect(0x3 ^ 0x3).toBe(0)
    expect(cpu.registers[0xa]).toBe(0)
  })

  test('15: ADD_VX_VY (8xy4) - Register x should be set to the value of the sum of register x and register y (VF with no carry)', async () => {
    cpu.load({ data: [0x8ab4] })
    cpu.registers[0xa] = 0x3
    cpu.registers[0xb] = 0x4
    await cpu.step()

    expect(cpu.registers[0xa]).toBe(0x7)
    expect(cpu.registers[0xf]).toBe(0)
  })

  test('15: ADD_VX_VY (8xy4) - Register x should be set to the value of the sum of register x and register y (VF with carry)', async () => {
    cpu.load({ data: [0x8ab4] })
    cpu.registers[0xa] = 0xff
    cpu.registers[0xb] = 0xff
    await cpu.step()

    expect(cpu.registers[0xa]).toBe(0xfe)
    expect(cpu.registers[0xf]).toBe(1)
  })

  test('16: SUB_VX_VY (8xy5) - Register x should be set to the difference of register x and register y (VF with carry)', async () => {
    cpu.load({ data: [0x8ab5] })
    cpu.registers[0xa] = 0x4
    cpu.registers[0xb] = 0x2
    await cpu.step()

    expect(cpu.registers[0xa]).toBe(2)
    expect(cpu.registers[0xf]).toBe(1)
  })

  test('16: SUB_VX_VY (8xy5) - Register x should be set to the difference of register x and register y (VF with no carry)', async () => {
    cpu.load({ data: [0x8ab5] })
    cpu.registers[0xa] = 0x2
    cpu.registers[0xb] = 0x3
    await cpu.step()

    expect(cpu.registers[0xa]).toBe(255)
    expect(cpu.registers[0xf]).toBe(0)
  })

  test('17: SHR_VX_VY (8xy6) - Shift register x right 1 (AKA divide x by 2). Set VF to 1 if least significant bit of register x is 1', async () => {
    cpu.load({ data: [0x8ab6] })
    cpu.registers[0xa] = 0x3
    await cpu.step()

    expect(cpu.registers[0xa]).toBe(0x3 >> 1)
    expect(cpu.registers[0xf]).toBe(1)
  })

  test('18: SUBN_VX_VY (8xy7) - Set register x to the difference of register y and register x (VF with no carry)', async () => {
    cpu.load({ data: [0x8ab7] })
    cpu.registers[0xa] = 0x3
    cpu.registers[0xb] = 0x2
    await cpu.step()

    expect(cpu.registers[0xa]).toBe(255)
    expect(cpu.registers[0xf]).toBe(0)
  })

  test('18: SUBN_VX_VY (8xy7) - Set register x to the difference of register y and register x (VF with carry)', async () => {
    cpu.load({ data: [0x8ab7] })
    cpu.registers[0xa] = 0x2
    cpu.registers[0xb] = 0x3
    await cpu.step()

    expect(cpu.registers[0xa]).toBe(1)
    expect(cpu.registers[0xf]).toBe(1)
  })

  test('19: SHL_VX_VY (8xyE) - Shift register x left one (AKA multiply by 2). Set VF to 1 if least significant bit of register x is 1', async () => {
    cpu.load({ data: [0x8abe] })
    cpu.registers[0xa] = 0x3
    await cpu.step()

    expect(cpu.registers[0xa]).toBe(0x3 << 1)
    expect(cpu.registers[0xf]).toBe(0)
  })

  test('20: SNE_VX_VY (9xy0) - Program counter should increment by four bytes if register x is not equal to register y', async () => {
    cpu.load({ data: [0x9ab0] })
    cpu.registers[0xa] = 0x3
    cpu.registers[0xb] = 0x4
    await cpu.step()

    expect(cpu.PC).toBe(0x204)
  })

  test('20: SNE_VX_VY (9xy0) - Program counter should increment by two bytes if register x is equal to register y', async () => {
    cpu.load({ data: [0x9ab0] })
    cpu.registers[0xa] = 0x3
    cpu.registers[0xb] = 0x3
    await cpu.step()

    expect(cpu.PC).toBe(0x202)
  })

  test('21: LD_I_ADDR (Annn) - I should be set to the value of argument nnn', async () => {
    cpu.load({ data: [0xa999] })
    await cpu.step()

    expect(cpu.I).toBe(0x999)
  })

  test('22: JP_V0_ADDR (Bnnn) - Program counter should be set to the sum of V0 and argument nnn', async () => {
    cpu.load({ data: [0xb300] })
    cpu.registers[0] = 0x2
    await cpu.step()

    expect(cpu.PC).toBe(0x2 + 0x300)
  })

  // 23: RND_VX_NN (Cxnn) Can't seed/test random number

  test('24: DRW_VX_VY_N (Dxyn) - CPU should halt if I + argument nn exceed 4095', async () => {
    cpu.load({ data: [0xd005] })
    cpu.I = 4091

    let error
    try {
      await cpu.step()
    } catch (e) {
      error = e
    }

    // BSOD on halted program
    expect(error).toEqual(new Error('Memory out of bounds.'))
  })

  test('24: DRW_VX_VY_N (Dxyn) - n byte sprite should be disiplayed at coordinates in register x, register y', async () => {
    cpu.load({ data: [0xd125] })
    cpu.registers[0x1] = 1
    cpu.registers[0x2] = 1
    await cpu.step()
    cpu.interface.renderDisplay()
    expect(cpuInterface.display[1][1]).toBe(1)
    expect(cpuInterface.display[2][1]).toBe(1)
    expect(cpuInterface.display[3][1]).toBe(1)
    expect(cpuInterface.display[4][1]).toBe(1)
    expect(cpuInterface.display[2][1]).toBe(1)
    expect(cpuInterface.display[2][2]).toBe(0)
    expect(cpuInterface.display[2][3]).toBe(0)
    expect(cpuInterface.display[2][4]).toBe(1)
    expect(cpuInterface.display[3][1]).toBe(1)
    expect(cpuInterface.display[3][2]).toBe(0)
    expect(cpuInterface.display[3][3]).toBe(0)
    expect(cpuInterface.display[3][4]).toBe(1)
    expect(cpuInterface.display[4][1]).toBe(1)
    expect(cpuInterface.display[4][2]).toBe(0)
    expect(cpuInterface.display[4][3]).toBe(0)
    expect(cpuInterface.display[4][4]).toBe(1)
    expect(cpuInterface.display[5][1]).toBe(1)
    expect(cpuInterface.display[5][1]).toBe(1)
    expect(cpuInterface.display[5][1]).toBe(1)
    expect(cpuInterface.display[5][1]).toBe(1)

    // No pixels were erased (no collision)
    expect(cpu.registers[0xf]).toBe(0)

    // This test relies on the previous one, to erase the previous values with collisions
    cpu.load({ data: [0xd125] })
    cpu.registers[0x1] = 1
    cpu.registers[0x2] = 1
    await cpu.step()
    cpu.interface.renderDisplay()
    expect(cpuInterface.display[1][1]).toBe(0)
    expect(cpuInterface.display[2][1]).toBe(0)
    expect(cpuInterface.display[3][1]).toBe(0)
    expect(cpuInterface.display[4][1]).toBe(0)
    expect(cpuInterface.display[2][1]).toBe(0)
    expect(cpuInterface.display[2][4]).toBe(0)
    expect(cpuInterface.display[3][1]).toBe(0)
    expect(cpuInterface.display[3][4]).toBe(0)
    expect(cpuInterface.display[4][1]).toBe(0)
    expect(cpuInterface.display[4][4]).toBe(0)
    expect(cpuInterface.display[5][1]).toBe(0)
    expect(cpuInterface.display[5][1]).toBe(0)
    expect(cpuInterface.display[5][1]).toBe(0)
    expect(cpuInterface.display[5][1]).toBe(0)

    // All pixels were erased (collision)
    expect(cpu.registers[0xf]).toBe(1)
  })

  test('25: SKP_VX (Ex9E) - Program counter should increment by four bytes if key with value of register x is selected', async () => {
    cpu.load({ data: [0xea9e] })
    cpu.registers[0xa] = 4
    // Mock CPU interface keys 0, 2, 3, 4 selected
    await cpu.step()

    expect(cpu.PC).toBe(0x204)
  })

  test('25: SKP_VX (Ex9E) - Program counter should increment by two bytes if key with value of register x is not selected', async () => {
    cpu.load({ data: [0xea9e] })
    cpu.registers[0xa] = 1
    // Mock CPU interface does not have 1 selected
    await cpu.step()

    expect(cpu.PC).toBe(0x202)
  })

  test('26: SKNP_VX (ExA1) - Program counter should increment by two bytes if value of register x is a selected key', async () => {
    cpu.load({ data: [0xeba1] })
    cpu.registers[0xb] = 4
    await cpu.step()

    expect(cpu.PC).toBe(0x202)
  })

  test('26: SKNP_VX (ExA1) - Program counter should increment by four bytes if value of register x is not a selected key', async () => {
    cpu.load({ data: [0xea9e] })
    cpu.registers[0xb] = 1
    await cpu.step()

    expect(cpu.PC).toBe(0x204)
  })

  test('27: LD_VX_DT (Fx07) - Register x should be set to the value of DT (delay timer)', async () => {
    cpu.load({ data: [0xfa07] })
    cpu.DT = 0xf
    await cpu.step()

    expect(cpu.registers[0xa]).toBe(0xf)
  })

  test('28: LD_VX_N (Fx0A) - ', async () => {
    // todo tick
    cpu.load({ data: [0xfb0a] })
    await cpu.step()

    expect(cpu.registers[0xb]).toBe(5)
  })

  test('29: LD_DT_VX (Fx15) - ', async () => {
    // todo tick
    cpu.load({ data: [0xfb15] })
    cpu.registers[0xb] = 0xf
    await cpu.step()

    expect(cpu.DT).toBe(0xf)
  })

  test('30: LD_ST_VX (Fx18) - ', async () => {
    // todo tick
    cpu.load({ data: [0xfa18] })
    cpu.registers[0xa] = 0xf
    await cpu.step()

    expect(cpu.ST).toBe(0xf)
  })

  test('31: ADD_I_VX (Fx1E) - I should be set to the value of the sum of I and register x', async () => {
    cpu.load({ data: [0xfa1e] })
    cpu.I = 0xe
    cpu.registers[0xa] = 0xf
    await cpu.step()

    expect(cpu.I).toBe(0xe + 0xf)
  })

  test('32: LD_F_VX (Fx29) - CPU should halt if register x is not equal to 0 through F', async () => {
    cpu.load({ data: [0xfa29] })
    cpu.registers[0xa] = 16

    let error
    try {
      await cpu.step()
    } catch (e) {
      error = e
    }

    // BSOD on halted program
    expect(error).toEqual(new Error('Invalid digit.'))
  })

  test('32: LD_F_VX (Fx29) - I should be set to the location of the sprite for digit in register x', async () => {
    cpu.load({ data: [0xfa29] })
    cpu.registers[0xa] = 0xa
    await cpu.step()

    expect(cpu.I).toBe(0xa * 5)
  })

  test('33: LD_B_VX (Fx33) - CPU should halt if I is greater than 4093', async () => {
    cpu.load({ data: [0xfa33] })
    cpu.registers[0xa] = 0x7b
    cpu.I = 4094

    let error
    try {
      await cpu.step()
    } catch (e) {
      error = e
    }

    // BSOD on halted program
    expect(error).toEqual(new Error('Memory out of bounds.'))
  })

  test('33: LD_B_VX (Fx33) - BCD representation of register x should be loaded into memory I, I+1, I+2 ', async () => {
    cpu.load({ data: [0xfa33] })
    cpu.registers[0xa] = 0x7b
    cpu.I = 0x300
    await cpu.step()

    expect(cpu.memory[0x300]).toBe(1)
    expect(cpu.memory[0x301]).toBe(2)
    expect(cpu.memory[0x302]).toBe(3)
  })

  test('34: LD_I_VX (Fx55) - CPU should halt if memory will exceed 4095', async () => {
    cpu.load({ data: [0xfb55] })
    cpu.I = 4085

    let error
    try {
      await cpu.step()
    } catch (e) {
      error = e
    }

    // BSOD on halted program
    expect(error).toEqual(new Error('Memory out of bounds.'))
  })

  test('34: LD_I_VX (Fx55) - Memory should be set to register 0 through register x starting at location I', async () => {
    cpu.load({ data: [0xfb55] })
    cpu.I = 0x400

    for (let i = 0; i <= 0xb; i++) {
      cpu.registers[i] = i
    }
    await cpu.step()

    for (let i = 0; i <= 0xb; i++) {
      expect(cpu.memory[cpu.I + i]).toBe(i)
    }

    expect(cpu.memory[cpu.I + 0xc]).toBe(0)
  })

  test('35: LD_VX_I (Fx65) - CPU should halt if memory will exceed 4095', async () => {
    cpu.load({ data: [0xfa65] })
    cpu.I = 4086

    let error
    try {
      await cpu.step()
    } catch (e) {
      error = e
    }

    // BSOD on halted program
    expect(error).toEqual(new Error('Memory out of bounds.'))
  })

  test('35: LD_VX_I (Fx65) - Registers 0 through x should be set to the value of memory starting at location I', async () => {
    cpu.load({ data: [0xfa65] })
    cpu.I = 0x400

    for (let i = 0; i <= 0xa; i++) {
      cpu.memory[cpu.I + i] = i
    }
    await cpu.step()

    for (let i = 0; i <= 0xa; i++) {
      expect(cpu.registers[i]).toBe(i)
    }
    expect(cpu.registers[0xb]).toBe(0)
  })

  test('36: DW (Data Word) - CPU should halt if instruction is a data word', async () => {
    cpu.load({ data: [0x5154] })

    let error
    try {
      await cpu.step()
    } catch (e) {
      error = e
    }

    // BSOD on halted program
    expect(error).toEqual(new Error('Illegal instruction.'))
  })
})

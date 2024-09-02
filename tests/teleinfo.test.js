/* eslint-disable no-undef */
const TeleInfo = require('../lib/teleinfo')
const logger = require('../lib/logs')
const { eventEmitter } = require('../lib/utils')
const { SerialPortMock } = require('serialport')

describe('Constructor and Basic function', () => {
  test('TeleInfo should throw an error on empty port', () => {
    expect(() => { new TeleInfo() }).toThrowError(new Error('Serial port must be provided'))
  })
  test('TeleInfo should initialize with appropriate values', () => {
    const tic = new TeleInfo('/dev/ttyUSB5')
    expect(tic.SerPort).toBeUndefined()
    expect(tic.actualFrame).toBeUndefined()
    expect(tic.port).toEqual('/dev/ttyUSB5')
    expect(tic.ticmode).toEqual('standard')
    expect(tic.baudrate).toEqual(9600)
  })
  test('Warn shoud thrown on call to processError', () => {
    const spy = jest.spyOn(logger, 'warn')
    const tic = new TeleInfo('/dev/ttyJEST0')
    tic.processError('This is an error')
    expect(spy).toHaveBeenCalledWith('This is an error')
  })
})

describe('Connection', () => {
  beforeEach(() => {
    SerialPortMock.binding.createPort('/dev/ttyJEST0')
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })
  test('connect should throw an error on failed port', async () => {
    const tic = new TeleInfo('/dev/ttyJEST1')
    await expect(async () => { await tic.connect() }).rejects.toThrowError(new Error('Error: No such file or directory, cannot open /dev/ttyJEST1'))
  })
  test('TeleInfo should disconnect when SIGTERM And SIGINT are emitted', async () => {
    const tic = new TeleInfo('/dev/ttyJEST0')
    jest.spyOn(tic, 'disconnect').mockImplementation(() => {})
    await tic.connect(SerialPortMock)
    process.emit('SIGTERM')
    process.emit('SIGINT')
    expect(tic.disconnect).toHaveBeenCalledTimes(2)
  })
  test('connect should connect to serial port when called', async () => {
    const tic = new TeleInfo('/dev/ttyJEST0')
    await tic.connect(SerialPortMock)
    expect(tic.SerPort).toBeInstanceOf(SerialPortMock)
    await tic.disconnect()
  })
})

describe('Decode Checksum and Data', () => {
  const tic = new TeleInfo('/dev/ttyJEST0')
  const tic2 = new TeleInfo('/dev/ttyJEST0', 'historic')
  afterEach(() => {
    jest.restoreAllMocks()
  })
  test('Should return false when cheksum is invalid', () => {
    const val = tic.validChecksum('IRMS1   001     /')
    expect(val).toBeFalsy()
  })
  test('Should return true when cheksum is valid', () => {
    const val = tic2.validChecksum('ADCO 031428143221 6')
    expect(val).toBeTruthy()
  })
  test('Should throw an error on corrupted line', () => {
    const spy = jest.spyOn(logger, 'warn')
    tic2.getLineData('031428143221 6', {})
    expect(spy).toHaveBeenCalledWith('Corrupted line received')
  })
  test('Should return object of line data', () => {
    const ret = {}
    tic.getLineData('UMOY1\tE221013203000\t235\t#', ret)
    expect(ret.UMOY1).toEqual('235')
  })
  test('Shoud decode PPOT frame on historic mode', () => {
    const ret = {}
    tic2.getLineData('PPOT 00 8', ret)
    expect(ret).toEqual({ PPOT1: 0, PPOT2: 0, PPOT3: 0 })
  })
  test('Shoud decode PPOT frame on historic mode', () => {
    const ret = {}
    tic2.getLineData('PPOT 02 8', ret)
    expect(ret).toEqual({ PPOT1: 1, PPOT2: 0, PPOT3: 0 })
  })
  test('Shoud decode PPOT frame on historic mode', () => {
    const ret = {}
    tic2.getLineData('PPOT 04 8', ret)
    expect(ret).toEqual({ PPOT1: 0, PPOT2: 1, PPOT3: 0 })
  })
  test('Shoud decode PPOT frame on historic mode', () => {
    const ret = {}
    tic2.getLineData('PPOT 06 8', ret)
    expect(ret).toEqual({ PPOT1: 1, PPOT2: 1, PPOT3: 0 })
  })
  test('Shoud decode PPOT frame on historic mode', () => {
    const ret = {}
    tic2.getLineData('PPOT 08 8', ret)
    expect(ret).toEqual({ PPOT1: 0, PPOT2: 0, PPOT3: 1 })
  })
  test('Shoud decode PPOT frame on historic mode', () => {
    const ret = {}
    tic2.getLineData('PPOT 0C 8', ret)
    expect(ret).toEqual({ PPOT1: 0, PPOT2: 1, PPOT3: 1 })
  })
  test('Shoud decode PPOT frame on historic mode', () => {
    const ret = {}
    tic2.getLineData('PPOT 0E 8', ret)
    expect(ret).toEqual({ PPOT1: 1, PPOT2: 1, PPOT3: 1 })
  })
  test('Shoud decode STGE frame on standard mode', () => {
    const ret = {}
    tic.getLineData('STGE\t40000001\tC', ret)
    expect(ret).toEqual({ STGE01: 1, STGE02: 'Ferme', STGE03: 0, STGE04: 0, STGE05: 0, STGE06: 'Consommateur', STGE07: 0, STGE08: 'EASF01', STGE09: 'EASD01', STGE10: 0, STGE11: 0, STGE12: 'Desactivee', STGE13: 'New/Unlock', STGE14: 0, STGE15: 'Sans Annonce', STGE16: 'Sans Annonce', STGE17: 0, STGE18: 1 })
  })
  test('Shoud decode STGE frame on standard mode', () => {
    const ret = {}
    tic.getLineData('STGE\t15AB47D2\tC', ret)
    expect(ret).toEqual({ STGE01: 0, STGE02: 'Ouvert sur surpuissance', STGE03: 1, STGE04: 1, STGE05: 1, STGE06: 'Producteur', STGE07: 1, STGE08: 'EASF02', STGE09: 'EASD02', STGE10: 1, STGE11: 1, STGE12: 'Activee sans securite', STGE13: 'New/Lock', STGE14: 1, STGE15: 'BLEU', STGE16: 'BLEU', STGE17: 1, STGE18: 0 })
  })
  test('Shoud decode STGE frame on standard mode', () => {
    const ret = {}
    tic.getLineData('STGE\tAA588804\tC', ret)
    expect(ret).toEqual({ STGE01: 0, STGE02: 'Ouvert sur surtension', STGE03: 0, STGE04: 0, STGE05: 0, STGE06: 'Consommateur', STGE07: 0, STGE08: 'EASF03', STGE09: 'EASD03', STGE10: 0, STGE11: 0, STGE12: 'Activee avec securite', STGE13: 'Registered', STGE14: 0, STGE15: 'BLANC', STGE16: 'BLANC', STGE17: 2, STGE18: 2 })
  })
  test('Shoud decode STGE frame on standard mode', () => {
    const ret = {}
    tic.getLineData('STGE\tFF70CC06\tC', ret)
    expect(ret).toEqual({ STGE01: 0, STGE02: 'Ouvert sur delestage', STGE03: 0, STGE04: 0, STGE05: 0, STGE06: 'Consommateur', STGE07: 0, STGE08: 'EASF04', STGE09: 'EASD04', STGE10: 0, STGE11: 0, STGE12: 'INVALID', STGE13: 'INVALID', STGE14: 0, STGE15: 'ROUGE', STGE16: 'ROUGE', STGE17: 3, STGE18: 3 })
  })
  test('Shoud decode STGE frame on standard mode', () => {
    const ret = {}
    tic.getLineData('STGE\t40001008\tC', ret)
    expect(ret).toEqual({ STGE01: 0, STGE02: 'Ouvert sur ordre CPL ou Euridis', STGE03: 0, STGE04: 0, STGE05: 0, STGE06: 'Consommateur', STGE07: 0, STGE08: 'EASF05', STGE09: 'EASD01', STGE10: 0, STGE11: 0, STGE12: 'Desactivee', STGE13: 'New/Unlock', STGE14: 0, STGE15: 'Sans Annonce', STGE16: 'Sans Annonce', STGE17: 0, STGE18: 1 })
  })
  test('Shoud decode STGE frame on standard mode', () => {
    const ret = {}
    tic.getLineData('STGE\t4000140A\tC', ret)
    expect(ret).toEqual({ STGE01: 0, STGE02: 'Ouvert sur surchauffe avec I > Imax', STGE03: 0, STGE04: 0, STGE05: 0, STGE06: 'Consommateur', STGE07: 0, STGE08: 'EASF06', STGE09: 'EASD01', STGE10: 0, STGE11: 0, STGE12: 'Desactivee', STGE13: 'New/Unlock', STGE14: 0, STGE15: 'Sans Annonce', STGE16: 'Sans Annonce', STGE17: 0, STGE18: 1 })
  })
  test('Shoud decode STGE frame on standard mode', () => {
    const ret = {}
    tic.getLineData('STGE\t4000180C\tC', ret)
    expect(ret).toEqual({ STGE01: 0, STGE02: 'Ouvert sur surchauffe avec I < Imax', STGE03: 0, STGE04: 0, STGE05: 0, STGE06: 'Consommateur', STGE07: 0, STGE08: 'EASF07', STGE09: 'EASD01', STGE10: 0, STGE11: 0, STGE12: 'Desactivee', STGE13: 'New/Unlock', STGE14: 0, STGE15: 'Sans Annonce', STGE16: 'Sans Annonce', STGE17: 0, STGE18: 1 })
  })
  test('Shoud decode STGE frame on standard mode', () => {
    const ret = {}
    tic.getLineData('STGE\t40001C0E\tC', ret)
    expect(ret).toEqual({ STGE01: 0, STGE02: 'INVALID', STGE03: 0, STGE04: 0, STGE05: 0, STGE06: 'Consommateur', STGE07: 0, STGE08: 'EASF08', STGE09: 'EASD01', STGE10: 0, STGE11: 0, STGE12: 'Desactivee', STGE13: 'New/Unlock', STGE14: 0, STGE15: 'Sans Annonce', STGE16: 'Sans Annonce', STGE17: 0, STGE18: 1 })
  })
  test('Shoud decode STGE frame on standard mode', () => {
    const ret = {}
    tic.getLineData('STGE\t40002000\tC', ret)
    expect(ret).toEqual({ STGE01: 0, STGE02: 'Ferme', STGE03: 0, STGE04: 0, STGE05: 0, STGE06: 'Consommateur', STGE07: 0, STGE08: 'EASF09', STGE09: 'EASD01', STGE10: 0, STGE11: 0, STGE12: 'Desactivee', STGE13: 'New/Unlock', STGE14: 0, STGE15: 'Sans Annonce', STGE16: 'Sans Annonce', STGE17: 0, STGE18: 1 })
  })
  test('Shoud decode STGE frame on standard mode', () => {
    const ret = {}
    tic.getLineData('STGE\t40002400\tC', ret)
    expect(ret).toEqual({ STGE01: 0, STGE02: 'Ferme', STGE03: 0, STGE04: 0, STGE05: 0, STGE06: 'Consommateur', STGE07: 0, STGE08: 'EASF10', STGE09: 'EASD01', STGE10: 0, STGE11: 0, STGE12: 'Desactivee', STGE13: 'New/Unlock', STGE14: 0, STGE15: 'Sans Annonce', STGE16: 'Sans Annonce', STGE17: 0, STGE18: 1 })
  })
  test('Shoud decode STGE frame on standard mode', () => {
    const ret = {}
    tic.getLineData('STGE\t40003C00\tC', ret)
    expect(ret).toEqual({ STGE01: 0, STGE02: 'Ferme', STGE03: 0, STGE04: 0, STGE05: 0, STGE06: 'Consommateur', STGE07: 0, STGE08: 'INVALID', STGE09: 'EASD01', STGE10: 0, STGE11: 0, STGE12: 'Desactivee', STGE13: 'New/Unlock', STGE14: 0, STGE15: 'Sans Annonce', STGE16: 'Sans Annonce', STGE17: 0, STGE18: 1 })
  })
  test('Shoud decode RELAIS Off frame on standard mode', () => {
    const ret = {}
    tic.getLineData('RELAIS\t000\tB', ret)
    expect(ret).toEqual({ RELAIS01: 0, RELAIS02: 0, RELAIS03: 0, RELAIS04: 0, RELAIS05: 0, RELAIS06: 0, RELAIS07: 0, RELAIS08: 0 })
  })
  test('Shoud decode RELAIS On frame on standard mode', () => {
    const ret = {}
    tic.getLineData('RELAIS\t255\tB', ret)
    expect(ret).toEqual({ RELAIS01: 1, RELAIS02: 1, RELAIS03: 1, RELAIS04: 1, RELAIS05: 1, RELAIS06: 1, RELAIS07: 1, RELAIS08: 1 })
  })
})

describe('processData function', () => {
  const CR = String.fromCharCode(13)
  const LF = String.fromCharCode(10)
  let frame = 'ADCO 031428143221 6' + CR + LF + 'OPTARIF BASE 0' + CR
  frame += LF + 'ISOUSC 15 <' + CR + LF + 'BASE 003775961 1' + CR + LF + 'PTEC TH.. $' + CR
  frame += LF + 'IINST 000 W' + CR + LF + 'IMAX 000 ?' + CR + LF + 'PAPP 00000 !' + CR
  frame += LF + 'MOTDETAT 000000 B'
  let frame2 = 'ADCO 031428143221 6' + CR + LF + 'OPTARIF BASE 0' + CR
  frame2 += LF + 'ISOUSC 15 <' + CR + LF + 'BASE 003775961 1' + CR + LF + 'PTEC TH.. $' + CR
  frame2 += LF + 'IINST 000 W' + CR + LF + 'IMAX 000 1' + CR + LF + 'PAPP 00000 !' + CR
  frame2 += LF + 'MOTDETAT 000000 B'
  let frame3 = 'ADSC\t042076248191\t9' + CR + LF + 'VTIC\t02\tJ' + CR + LF + 'IRMS1\t001\t/' + CR
  frame3 += LF + 'DATE\tE221016123654\t\t?' + CR + LF + 'NGTF\t     TEMPO\tF' + CR + LF + 'URMS1\t238\tG' + CR
  frame3 += LF + 'LTARF\t    HP  BLEU\t+'
  let frame4 = 'ADSC\t042076248191\t9' + CR + LF + 'NGTF\t     TEMPO\tF' + CR
  frame4 += LF + 'IRMS1\t002\t0' + CR + LF + 'IRMS2\t002\t1' + CR + LF + 'IRMS3\t002\t2' + CR
  frame4 += LF + 'URMS1\t235\tD' + CR + LF + 'URMS2\t236\tF' + CR + LF + 'URMS3\t237\tH'

  afterEach(() => {
    jest.restoreAllMocks()
  })
  test('Should warn on incomplete frame', () => {
    const spy = jest.spyOn(logger, 'warn')
    const tic = new TeleInfo('/dev/ttyJEST0', 'historic')
    tic.processData(frame.substring(25))
    expect(spy).toHaveBeenCalledWith('Incomplete frame received')
  })
  test('Should warn on checksum error', () => {
    const spy = jest.spyOn(logger, 'warn')
    const tic = new TeleInfo('/dev/ttyJEST0', 'historic')
    tic.processData(frame2)
    expect(spy).toHaveBeenCalledWith('Checksum error for \'IMAX 000 1\'')
    expect(tic.actualFrame).toBeUndefined()
  })
  test('Should update frame data', () => {
    const tic = new TeleInfo('/dev/ttyJEST0', 'historic')
    tic.processData(frame)
    expect(tic.actualFrame).toEqual({ ADCO: '031428143221', BASE: '003775961', IINST: '000', IMAX: '000', ISOUSC: '15', MOTDETAT: '000000', OPTARIF: 'BASE', PAPP: '00000', PTEC: 'TH' })
  })
  test('Should reset actual data each minute', () => {
    const tic = new TeleInfo('/dev/ttyJEST0', 'historic')
    tic.lastEmitTime = Date.now() - 60001
    tic.processData(frame)
    expect(tic.actualFrame).toEqual({ ADCO: '031428143221', BASE: '003775961', IINST: '000', IMAX: '000', ISOUSC: '15', MOTDETAT: '000000', OPTARIF: 'BASE', PAPP: '00000', PTEC: 'TH' })
  })
  test('Should send emit event with right values', () => {
    const spy = jest.spyOn(eventEmitter, 'emit').mockImplementation(() => {})
    const tic = new TeleInfo('/dev/ttyJEST0', 'historic')
    tic.processData(frame)
    expect(spy).toHaveBeenCalledWith('frame', '031428143221', { ADCO: '031428143221', BASE: '003775961', IINST: '000', IMAX: '000', ISOUSC: '15', MOTDETAT: '000000', OPTARIF: 'BASE', PAPP: '00000', PTEC: 'TH' })
  })
  test('Should not send emit event if same frame', () => {
    const spy = jest.spyOn(eventEmitter, 'emit').mockImplementation(() => {})
    const tic = new TeleInfo('/dev/ttyJEST0', 'historic')
    tic.actualFrame = { ADCO: '031428143221', BASE: '003775961', IINST: '000', IMAX: '000', ISOUSC: '15', MOTDETAT: '000000', OPTARIF: 'BASE', PAPP: '00000', PTEC: 'TH' }
    tic.processData(frame)
    expect(spy).not.toHaveBeenCalled()
  })
  test('Should not report DATE in standard mode', () => {
    const tic = new TeleInfo('/dev/ttyJEST0')
    tic.processData(frame3)
    expect(tic.actualFrame).toEqual({ ADSC: '042076248191', LTARF: 'HP BLEU', NGTF: 'TEMPO', VTIC: '02', IRMS1: '001', URMS1: '238', PRMS: '238' })
  })
  test('Should return POWER in standard mode', () => {
    const tic = new TeleInfo('/dev/ttyJEST0')
    tic.processData(frame4)
    expect(tic.actualFrame).toEqual({ ADSC: '042076248191', NGTF: 'TEMPO', IRMS1: '002', IRMS2: '002', IRMS3: '002', URMS1: '235', URMS2: '236', URMS3: '237', PRMS1: '470', PRMS2: '472', PRMS3: '474', PRMS: '1416', IRMS: '6' })
  })
})

describe('deepDiffObj', () => {
  const tic = new TeleInfo('/dev/ttyJEST0')
  const someDate = new Date()
  const someOtherDate = new Date('2020-01-01')
  expect(someOtherDate).not.toBe(someDate)

  test('should throw with invalid args', () => {
    expect(() => { tic.deepDiffObj() }).toThrow()
    expect(() => { tic.deepDiffObj(true) }).toThrow()
    expect(() => { tic.deepDiffObj({}) }).toThrow()
    expect(() => { tic.deepDiffObj(null, null) }).toThrow()
    expect(() => { tic.deepDiffObj({}, false) }).toThrow()
  })
  test('should return object when base is falsy', () => {
    let ret
    ret = tic.deepDiffObj(null, { a: 1 })
    expect(ret).toEqual({ a: 1 })
    ret = tic.deepDiffObj(undefined, { a: 1 })
    expect(ret).toEqual({ a: 1 })
    ret = tic.deepDiffObj(false, { a: 1 })
    expect(ret).toEqual({ a: 1 })
    ret = tic.deepDiffObj(false, someDate)
    expect(ret).toEqual(someDate)
  })
  test('should return new fields', () => {
    let ret
    ret = tic.deepDiffObj({}, { a: 1 })
    expect(ret).toEqual({ a: 1 })
    ret = tic.deepDiffObj({}, { a: 'X' })
    expect(ret).toEqual({ a: 'X' })
    ret = tic.deepDiffObj({}, { a: null })
    expect(ret).toEqual({ a: null })
    ret = tic.deepDiffObj({}, { a: undefined })
    expect(ret).toEqual({ a: undefined })
    ret = tic.deepDiffObj({}, { a: someDate })
    expect(ret).toEqual({ a: someDate })
    ret = tic.deepDiffObj({}, { a: [1, 2, 3] })
    expect(ret).toEqual({ a: [1, 2, 3] })
    ret = tic.deepDiffObj({}, { a: { b: 2 } })
    expect(ret).toEqual({ a: { b: 2 } })
  })
  test('should not return equal fields', () => {
    let ret
    ret = tic.deepDiffObj({ a: 1 }, { a: 1 })
    expect(ret).toEqual({})
    ret = tic.deepDiffObj({ a: null }, { a: null })
    expect(ret).toEqual({})
    ret = tic.deepDiffObj({ a: undefined }, { a: undefined })
    expect(ret).toEqual({})
    ret = tic.deepDiffObj({ a: someDate }, { a: someDate })
    expect(ret).toEqual({})
    ret = tic.deepDiffObj({ a: [1, 2, 3] }, { a: [1, 2, 3] })
    expect(ret).toEqual({})
    ret = tic.deepDiffObj({ a: { b: 2 } }, { a: { b: 2 } })
    expect(ret).toEqual({})
  })
  test('should return changed fields', () => {
    let ret
    ret = tic.deepDiffObj({ a: 1 }, { a: 2 })
    expect(ret).toEqual({ a: 2 })
    ret = tic.deepDiffObj({ a: 1 }, { a: 0 })
    expect(ret).toEqual({ a: 0 })
    ret = tic.deepDiffObj({ a: 0.0 }, { a: 3 })
    expect(ret).toEqual({ a: 3 })
    ret = tic.deepDiffObj({ a: null }, { a: 'X' })
    expect(ret).toEqual({ a: 'X' })
    ret = tic.deepDiffObj({ a: 'X' }, { a: null })
    expect(ret).toEqual({ a: null })
    ret = tic.deepDiffObj({ a: undefined }, { a: 'X' })
    expect(ret).toEqual({ a: 'X' })
    ret = tic.deepDiffObj({ a: 'X' }, { a: undefined })
    expect(ret).toEqual({ a: undefined })
    ret = tic.deepDiffObj({ a: someDate }, { a: someOtherDate })
    expect(ret).toEqual({ a: someOtherDate })
    ret = tic.deepDiffObj({ a: [1, 2, 3] }, { a: [1, 2, 3, 4] })
    expect(ret).toEqual({ a: [1, 2, 3, 4] })
    ret = tic.deepDiffObj({ a: [1, 2, 3, 4] }, { a: [1, 2, 3] })
    expect(ret).toEqual({ a: [1, 2, 3] })
  })
  test('should work for nested fields', () => {
    let ret
    ret = tic.deepDiffObj({}, { a: { b: 1 } })
    expect(ret).toEqual({ a: { b: 1 } })
    ret = tic.deepDiffObj({ a: {} }, { a: { b: 1 } })
    expect(ret).toEqual({ a: { b: 1 } })
    ret = tic.deepDiffObj({ a: { b: 1 } }, { a: { b: 1 } })
    expect(ret).toEqual({})
    ret = tic.deepDiffObj({ a: { b: 1 } }, { a: { b: 2 } })
    expect(ret).toEqual({ a: { b: 2 } })
    ret = tic.deepDiffObj({ a: { b: 1 } }, { a: { b: 0 } })
    expect(ret).toEqual({ a: { b: 0 } })
    ret = tic.deepDiffObj({ a: { b: 0 } }, { a: { b: 3.0 } })
    expect(ret).toEqual({ a: { b: 3.0 } })
    ret = tic.deepDiffObj({ a: { b: null } }, { a: { b: 'X' } })
    expect(ret).toEqual({ a: { b: 'X' } })
    ret = tic.deepDiffObj({ a: { b: 'X' } }, { a: { b: null } })
    expect(ret).toEqual({ a: { b: null } })
    ret = tic.deepDiffObj({ a: { b: undefined } }, { a: { b: 'X' } })
    expect(ret).toEqual({ a: { b: 'X' } })
    ret = tic.deepDiffObj({ a: { b: 'X' } }, { a: { b: undefined } })
    expect(ret).toEqual({ a: { b: undefined } })
    ret = tic.deepDiffObj({ a: { b: someDate } }, { a: { b: someOtherDate } })
    expect(ret).toEqual({ a: { b: someOtherDate } })
    ret = tic.deepDiffObj({ a: { b: [1, 2, 3] } }, { a: { b: [1, 2, 3, 4] } })
    expect(ret).toEqual({ a: { b: [1, 2, 3, 4] } })
    ret = tic.deepDiffObj({ a: { b: [1, 2, 3, 4] } }, { a: { b: [1, 2, 3] } })
    expect(ret).toEqual({ a: { b: [1, 2, 3] } })
  })
})

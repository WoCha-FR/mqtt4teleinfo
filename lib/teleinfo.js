const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')
const _ = require('lodash')
const logger = require('./logs')
const { eventEmitter } = require('./utils')

class TeleInfo {
  /**
   * Create an instance of Netatmo client
   *
   * @param {string} serport Serial port to read
   * @param {string} ticmode Teleinformation mode
   */
  constructor (serport, ticmode = 'standard') {
    if (!serport) {
      throw new Error('Serial port must be provided')
    }
    this.SerPort = undefined
    this.actualFrame = undefined
    this.port = serport
    this.ticmode = ticmode
    this.baudrate = ticmode === 'standard' ? 9600 : 1200
    this.lastEmitTime = Date.now()
  }

  /**
   * Connect to serial Port
   */
  connect (SerialPortClass = SerialPort) {
    logger.info(`Connecting to port [${this.port}] with ${this.ticmode} TIC mode`)
    return new Promise((resolve, reject) => {
      this.SerPort = new SerialPortClass({
        path: this.port,
        baudRate: this.baudrate,
        dataBits: 7,
        parity: 'even',
        stopBits: 1
      }, (error) => this.onConnect(error, resolve, reject))
    })
  }

  /**
   * On serial port connection event.
   * @param conError
   * @param resolve
   * @param reject
   */
  onConnect (conError, resolve, reject) {
    if (conError) {
      reject(conError)
    } else {
      const readParser = new ReadlineParser({ delimiter: String.fromCharCode(13, 3, 2, 10) })
      this.SerPort.pipe(readParser)
      this.SerPort.on('error', (e) => this.processError(e))
      readParser.on('data', (data) => this.processData(data))
      // Exit Handler
      process.on('SIGTERM', async () => await this.disconnect())
      process.on('SIGINT', async () => await this.disconnect())
      // Resolve
      resolve(this)
    }
  }

  /**
   * Disconnect from serial port.
   */
  async disconnect () {
    if (this.SerPort) {
      this.SerPort.close()
    }
  }

  /**
   * Process serial errors.
   * @param {Error} error
   */
  processError (error) {
    logger.warn(error)
  }

  /**
   * Validate checksum of a line
   * @param {string} line One line of information
   * @return {boolean} Checksum valid
   */
  validChecksum (line) {
    // String to validate
    let chars
    if (this.ticmode === 'historic') {
      chars = line.slice(0, -2)
    } else {
      chars = line.slice(0, -1)
    }
    // Get Checksum value
    const checksum = line.slice(-1)
    // Compute Checksum
    const sum = Array.from(chars).reduce((acc, curr) => acc + curr.charCodeAt(), 0)
    const computed = String.fromCharCode((sum & 0x3F) + 0x20)
    // Is Valid ?
    if (computed === checksum) {
      return true
    }
    return false
  }

  /**
   * Get line Label & Value
   * @param {string} line One line of information
   * @param {object} obj Object of current values
   * @return {object}
   */
  getLineData (line, obj) {
    // Split the lin
    let items = null
    if (this.ticmode === 'historic') {
      items = line.split(/\s+/)
    } else {
      items = line.split(/\t+/)
    }
    // Affect items
    let label
    let value

    if (items.length === 3 || items.length === 4) {
      label = items[0]
      value = items[1]
      if (items.length === 4) {
        value = items[2]
      }
    } else {
      logger.warn('Corrupted line received')
      return
    }
    // Decode Registers Value
    if (label === 'STGE') {
      const stgeInt = parseInt(value, 16)
      const stgeBin = stgeInt.toString(2).padStart(32, '0')
      const stgeBits = stgeBin.split('').reverse()
      let val
      // STGE01 - Bit 0 : Contact sec
      obj.STGE01 = parseInt(stgeBits[0], 2)
      // STGE02 - Bit 3 à 1 : Organe de coupure
      switch (parseInt(stgeBits[3] + stgeBits[2] + stgeBits[1], 2)) {
        case 0 :
          val = 'Ferme'
          break
        case 1 :
          val = 'Ouvert sur surpuissance'
          break
        case 2 :
          val = 'Ouvert sur surtension'
          break
        case 3 :
          val = 'Ouvert sur delestage'
          break
        case 4 :
          val = 'Ouvert sur ordre CPL ou Euridis'
          break
        case 5 :
          val = 'Ouvert sur surchauffe avec I > Imax'
          break
        case 6 :
          val = 'Ouvert sur surchauffe avec I < Imax'
          break
        default :
          val = 'INVALID'
      }
      obj.STGE02 = val
      // STGE03 - Bit 4 : État du cache-bornes distributeur
      obj.STGE03 = parseInt(stgeBits[4], 2)
      // STGE04 - Bit 6 : Surtension sur une des phases
      obj.STGE04 = parseInt(stgeBits[6], 2)
      // STGE05 - Bit 7 : Dépassement de la puissance de référence
      obj.STGE05 = parseInt(stgeBits[7], 2)
      // STGE06 - Bit 8 : Fonctionnement producteur/consommateur
      switch (parseInt(stgeBits[8], 2)) {
        case 1 :
          val = 'Producteur'
          break
        case 0 :
        default :
          val = 'Consommateur'
          break
      }
      obj.STGE06 = val
      // STGE07 - Bit 9 : Sens de l’énergie active
      obj.STGE07 = parseInt(stgeBits[9], 2)
      // STGE08 - Bit 13 à 10 : Tarif en cours sur le contrat fournisseur
      switch (parseInt(stgeBits[13] + stgeBits[12] + stgeBits[11] + stgeBits[10], 2)) {
        case 0 :
          val = 'EASF01'
          break
        case 1 :
          val = 'EASF02'
          break
        case 2 :
          val = 'EASF03'
          break
        case 3 :
          val = 'EASF04'
          break
        case 4 :
          val = 'EASF05'
          break
        case 5 :
          val = 'EASF06'
          break
        case 6 :
          val = 'EASF07'
          break
        case 7 :
          val = 'EASF08'
          break
        case 8 :
          val = 'EASF09'
          break
        case 9 :
          val = 'EASF10'
          break
        default :
          val = 'INVALID'
      }
      obj.STGE08 = val
      // STGE09 - Bit 15 à 14 : Tarif en cours sur le contrat distributeur
      switch (parseInt(stgeBits[15] + stgeBits[14], 2)) {
        case 1 :
          val = 'EASD02'
          break
        case 2 :
          val = 'EASD03'
          break
        case 3 :
          val = 'EASD04'
          break
        case 0 :
        default :
          val = 'EASD01'
          break
      }
      obj.STGE09 = val
      // STGE10 - Bit 16 : Mode dégradée de l’horloge
      obj.STGE10 = parseInt(stgeBits[16], 2)
      // STGE11 - Bit 17 : État de la sortie télé-information
      obj.STGE11 = parseInt(stgeBits[17], 2)
      // STGE12 - Bit 20 à 19 : État de la sortie communication Euridis
      switch (parseInt(stgeBits[20] + stgeBits[19], 2)) {
        case 0 :
          val = 'Desactivee'
          break
        case 1 :
          val = 'Activee sans securite'
          break
        case 3 :
          val = 'Activee avec securite'
          break
        default :
          val = 'INVALID'
      }
      obj.STGE12 = val
      // STGE13 - Bit 22 à 21 : Statut du CPL
      switch (parseInt(stgeBits[22] + stgeBits[21], 2)) {
        case 0 :
          val = 'New/Unlock'
          break
        case 1 :
          val = 'New/Lock'
          break
        case 2 :
          val = 'Registered'
          break
        default :
          val = 'INVALID'
      }
      obj.STGE13 = val
      // STGE14 - Bit 23 : Synchronisation CPL
      obj.STGE14 = parseInt(stgeBits[23], 2)
      // STGE15 - Bit 25 à 24 : Couleur du jour pour le contrat historique tempo
      switch (parseInt(stgeBits[25] + stgeBits[24], 2)) {
        case 1 :
          val = 'BLEU'
          break
        case 2 :
          val = 'BLANC'
          break
        case 3 :
          val = 'ROUGE'
          break
        case 0 :
        default :
          val = 'Sans Annonce'
      }
      obj.STGE15 = val
      // STGE16 - Bit 27 à 26 : Couleur du lendemain pour le contrat historique tempo
      switch (parseInt(stgeBits[27] + stgeBits[26], 2)) {
        case 1 :
          val = 'BLEU'
          break
        case 2 :
          val = 'BLANC'
          break
        case 3 :
          val = 'ROUGE'
          break
        case 0 :
        default :
          val = 'Sans Annonce'
      }
      obj.STGE16 = val
      // STGE17 - Bit 29 à 28 : Préavis pointes mobiles
      obj.STGE17 = parseInt(stgeBits[29] + stgeBits[28], 2)
      // STGE18 - Bit 31 à 30 : Pointe mobile (PM)
      obj.STGE18 = parseInt(stgeBits[31] + stgeBits[30], 2)
      // END - No storage of STGE Frame
      return
    }
    if (label === 'RELAIS') {
      const relaisInt = parseInt(value)
      const relaisBin = relaisInt.toString(2).padStart(8, '0')
      const relaisBits = relaisBin.split('').reverse()
      obj.RELAIS01 = parseInt(relaisBits[0], 2)
      obj.RELAIS02 = parseInt(relaisBits[1], 2)
      obj.RELAIS03 = parseInt(relaisBits[2], 2)
      obj.RELAIS04 = parseInt(relaisBits[3], 2)
      obj.RELAIS05 = parseInt(relaisBits[4], 2)
      obj.RELAIS06 = parseInt(relaisBits[5], 2)
      obj.RELAIS07 = parseInt(relaisBits[6], 2)
      obj.RELAIS08 = parseInt(relaisBits[7], 2)
      // End - No storage of RELAIS line
      return
    }
    // PPOT - Historic Tri
    if (label === 'PPOT') {
      const ppotInt = parseInt(value, 16)
      const ppotBin = ppotInt.toString(2).padStart(8, '0')
      const ppotBits = ppotBin.split('').reverse()
      obj.PPOT1 = parseInt(ppotBits[1], 2)
      obj.PPOT2 = parseInt(ppotBits[2], 2)
      obj.PPOT3 = parseInt(ppotBits[3], 2)
      // End - No storage of PPOT line
      return
    }
    // Sanitize
    if (label === 'DATE') { return }
    const valueSanitized = value.replace(/\.\./g, '').replace(/\s+/g, ' ').trim()
    // Set line in obj
    obj[label] = valueSanitized
  }

  /**
   * Deep diff between two objects - i.e. an object with the new value of new & changed fields.
   * Removed fields will be set as undefined on the result.
   * Only plain objects will be deeply compared (@see _.isPlainObject)
   *
   * Inspired by: https://gist.github.com/Yimiprod/7ee176597fef230d1451#gistcomment-2565071
   * This fork: https://gist.github.com/TeNNoX/5125ab5770ba287012316dd62231b764/
   *
   * @param  {Object} base   Object to compare with (if falsy we return object)
   * @param  {Object} object Object compared
   * @return {Object}        Return a new object who represent the changed & new values
   */
  deepDiffObj (base, object) {
    if (!object) throw new Error(`The object compared should be an object: ${object}`)
    if (!base) return object
    const result = _.transform(object, (result, value, key) => {
      if (!_.has(base, key)) result[key] = value // fix edge case: not defined to explicitly defined as undefined
      if (!_.isEqual(value, base[key])) {
        result[key] = _.isPlainObject(value) && _.isPlainObject(base[key]) ? this.deepDiffObj(base[key], value) : value
      }
    })
    // map removed fields to undefined
    _.forOwn(base, (value, key) => {
      if (!_.has(object, key)) result[key] = undefined
    })
    return result
  }

  /**
   * Process serial data
   * @param data Complete frame from TIC
   */
  processData (data) {
    // Is Frame Complete
    const start = data.substr(0, 4)
    if (start !== 'ADCO' && start !== 'ADSC') {
      logger.warn('Incomplete frame received')
      return
    }

    // Split frames in lines
    const frameData = {}
    const lines = data.split('\r\n')
    let i

    for (i = 0; i < lines.length; i++) {
      // Validate line by Checksum
      const line = lines[i]
      if (!this.validChecksum(line)) {
        logger.warn(`Checksum error for '${line}'`)
        return
      }
      // Get Label & Value of the current line
      this.getLineData(line, frameData)
    }
    // All lines is read
    // Last sended frame
    const currentTime = Date.now()
    if ((currentTime - this.lastEmitTime) > 60000) {
      this.actualFrame = undefined
      this.lastEmitTime = currentTime
    }
    // Power in W calculation
    if (this.ticmode === 'standard') {
      // Monophasé
      if (_.isUndefined(frameData.IRMS2)) {
        frameData.PRMS = '' + (frameData.IRMS1 * frameData.URMS1)
      } else {
        frameData.PRMS1 = '' + (frameData.IRMS1 * frameData.URMS1)
        frameData.PRMS2 = '' + (frameData.IRMS2 * frameData.URMS2)
        frameData.PRMS3 = '' + (frameData.IRMS3 * frameData.URMS3)
        frameData.IRMS = '' + (Number(frameData.IRMS1) + Number(frameData.IRMS2) + Number(frameData.IRMS3))
        frameData.PRMS = '' + (Number(frameData.PRMS1) + Number(frameData.PRMS2) + Number(frameData.PRMS3))
      }
    }
    // Get Difference between last frame an this frame
    const difference = this.deepDiffObj(this.actualFrame, frameData)
    // Publish Only Difference Or Time delay
    if (!_.isEmpty(difference)) {
      const mqttId = frameData.ADCO !== undefined ? frameData.ADCO : frameData.ADSC
      eventEmitter.emit('frame', mqttId, difference)
    }
    // Update actualFrame with new values
    this.actualFrame = frameData
  }
}

module.exports = TeleInfo

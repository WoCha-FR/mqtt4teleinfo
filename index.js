#!/usr/bin/env node
const config = require('./lib/config')
const logger = require('./lib/logs')
const MqttClient = require('./lib/mqtt')
const TeleInfo = require('./lib/teleinfo')

/**
 * Main function.
 */
async function main () {
  try {
    // mqtt Client
    const mqtt = new MqttClient(config.mqttUrl, config.mqttTopic, config.sslVerify)
    await mqtt.connect()
    // teleinfo Client
    const tic = new TeleInfo(config.serPort, config.ticMode)
    await tic.connect()
  } catch (e) {
    logger.error('Unable to run => See errors below')
    logger.error(e)
    process.exit(1)
  }
}
// Call the main code
main()

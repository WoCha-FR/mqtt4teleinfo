const yargs = require('yargs')

const config = yargs
  .usage('Usage: $0 [options]')
  .describe('a', 'Serial port')
  .describe('b', 'Teleinformation mode')
  .describe('u', 'mqtt broker url')
  .describe('t', 'mqtt topic prefix')
  .describe('v', 'possible values: error, warn, info, debug')
  .describe('s', 'allow ssl connections with invalid certs')
  .describe('z', 'log with no color')
  .alias({
    a: 'serPort',
    b: 'ticMode',
    u: 'mqttUrl',
    t: 'mqttTopic',
    v: 'logVerbosity',
    s: 'sslVerify',
    h: 'help',
    z: 'noColor'
  })
  .choices('b', ['standard', 'historic'])
  .boolean('ssl-verify')
  .default({
    a: '/dev/ttyUSB0',
    b: 'standard',
    u: 'mqtt://127.0.0.1',
    t: 'teleinfo',
    v: 'warn'
  })
  .help('help')
  .version()
  .strictOptions(true)
  .parserConfiguration({
    'camel-case-expansion': false,
    'strip-dashed': true
  })
  .argv

module.exports = config

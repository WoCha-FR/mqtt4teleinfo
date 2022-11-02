# mqtt4teleinfo

![npm](https://img.shields.io/npm/v/mqtt4teleinfo)
![License](https://img.shields.io/github/license/WoCha-FR/mqtt4teleinfo)
[![Build Status](https://app.travis-ci.com/WoCha-FR/mqtt4teleinfo.svg?branch=main)](https://app.travis-ci.com/WoCha-FR/mqtt4teleinfo)
[![Coverage Status](https://coveralls.io/repos/github/WoCha-FR/mqtt4teleinfo/badge.svg?branch=main)](https://coveralls.io/github/WoCha-FR/mqtt4teleinfo?branch=main)
![npm](https://img.shields.io/npm/dt/mqtt4teleinfo)

Publish values from french electricity meter to MQTT

## Installing

Simply install the package over npm. This will install all the required dependencies.

```
npm install -g mqtt4teleinfo
```

## Usage

```
Usage: mqtt4teleinfo.js [options]

Options:
  -a, --serPort       Serial port                      [default: "/dev/ttyUSB0"]
  -b, --ticMode       Teleinformation mode
                         [choices: "standard", "historic"] [default: "standard"]
  -u, --mqttUrl       mqtt broker url              [default: "mqtt://127.0.0.1"]
  -t, --mqttTopic     mqtt topic prefix                    [default: "teleinfo"]
  -v, --logVerbosity  possible values: error, warn, info, debug[default: "warn"]
  -s, --sslVerify     allow ssl connections with invalid certs
      --version       Show version number                              [boolean]
  -h, --help          Show help                                        [boolean]
```

### Example

```
mqtt4teleinfo -a /dev/ttyUSB1 -b historic
```

## MQTT Frame Output Example

```
[teleinfo/012345678910] {
  ADCO: '012345678910',
  OPTARIF: 'BASE',
  ISOUSC: '15',
  BASE: '003776419',
  PTEC: 'TH',
  IINST: '001',
  IMAX: '010',
  PAPP: '00000',
  MOTDETAT: '000000'
}
```

## Versioning

mqtt4apcaccess is maintained under the [semantic versioning](https://semver.org/) guidelines.

See the [releases](https://github.com/WoCha-FR/mqtt4teleinfo/releases) on this repository for changelog.

## License

This project is licensed under MIT License - see the [LICENSE](LICENSE) file for details

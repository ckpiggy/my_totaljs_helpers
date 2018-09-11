const jwt = require('jsonwebtoken')
const F = global.framework
const CONFIG = global.CONFIG

exports.name = 'JSONWebToken'
exports.version = '0.0.1'
exports.booting = true

exports.install = () => {
  F.encrypt = function(value) {
    try {
      return jwt.sign(value, CONFIG('secret-key'))
    } catch (e) {
      console.error(e)
      return null
    }
  }
  
  F.decrypt = function(value) {
    try {
      return jwt.verify(value, CONFIG('secret-key'))
    } catch (e) {
      console.log(e)
      return null
    }
  }
}


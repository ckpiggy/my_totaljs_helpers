const jwt = require('jsonwebtoken')
const F = global.framework
const CONFIG = global.CONFIG

F.encrypt = function(value) {
  try {
    return jwt.sign(value, CONFIG('secret-key'))
  } catch (e) {
    return null
  }
}

F.decrypt = function(value) {
  try {
    return jwt.verify(value, CONFIG('secret-key'))
  } catch (e) {
    return null
  }
}

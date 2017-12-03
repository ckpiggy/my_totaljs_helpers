const qs = require('qs'), F = global.F

F.onParseQuery = function (str) {
  return qs.parse(str)
}
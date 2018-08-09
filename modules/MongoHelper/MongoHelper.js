const mongodb = require('mongodb')
const Url = require('url')
const F = global.F
global.ObjectId = mongodb.ObjectId

exports.name = 'MongoHelper'
exports.version = '0.0.2'
exports.booting = true

exports.install = (options)=>{
  if (!options || !options.url) {
    throw new Error('need config mongodb url')
  }
  const url = options.url
  const poolSize = options.poolSize
  F.wait('mongodb')
  mongodb.MongoClient.connect(url, {w: 'majority', j: true, wtimeout: 200, poolSize: (poolSize || 100)}, function (error, client) {
    if (error)
      throw error
    const urlObj = Url.parse(url)
    const dbName = urlObj.pathname.replace('/', '')
    F.MongoDB = client.db(dbName)
    F.wait('mongodb')
    F.emit('database', F.MongoDB)
  })
}

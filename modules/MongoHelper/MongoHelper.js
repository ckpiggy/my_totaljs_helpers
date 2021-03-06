const mongodb = require('mongodb')
const Url = require('url')
const F = global.F
global.ObjectId = mongodb.ObjectID

exports.name = 'MongoHelper'
exports.version = '0.0.2'
exports.booting = true

exports.install = (options)=>{
  if (!options || !options.url) {
    throw new Error('need config mongodb url')
  }
  const url = options.url
  delete options.url
  const opt = Object.assign({
    w: 'majority', 
    j: true, 
    wtimeout: 200, 
    poolSize: 100,
    useNewUrlParser: true
  }, options)
  F.on('load', function () {
    mongodb.MongoClient.connect(url, opt, function (error, client) {
      if (error)
        throw error
      const urlObj = Url.parse(url)
      const dbName = urlObj.pathname.replace('/', '')
      F.MongoDB = client.db(dbName)
      F.emit('database', F.MongoDB)
      console.log('connected to database ' + dbName)
      F.wait('mongodb')
    })
  })
}

const mongodb = require('mongodb')
global.ObjectId = mongodb.ObjectId

exports.name = 'MongoHelper'
exports.version = '0.0.1'
exports.booting = true

exports.install = (option)=>{
  const url = option.url
  if (!url) {
    throw new Error('need config mongodb url')
  }
  F.wait('mongodb')
  mongodb.MongoClient.connect(url, {w: 'majority', j: true, wtimeout: 200}, function (error, db) {
    if (error)
      throw error
    F.wait('mongodb')
    F.emit('database', db)
    F.MongoDB = db
  })
}

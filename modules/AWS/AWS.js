const S3 = require('aws-sdk').S3

function createS3Client (accessKeyId, secretAccessKey, region, Bucket, ACL = 'public-read', CacheControl = 'max-age=604800') {
  const client = new S3({
    apiVersion: '2006-03-01',
    accessKeyId,
    secretAccessKey,
    region,
    params: {Bucket, ACL, CacheControl}
  })
  
  Object.defineProperties(client, {
    uploadFile: {
      enumerable: false,
      writable: false,
      value: function (key, file, expires) {
        const params = {
          Key: key,
          Body: file.readSync(),
          ContentType: file.type
        }
        if (expires) {params.Expires = expires}
        const upload = client.upload(params)
        return upload.promise()
      }
    },
    deleteFiles: {
      enumerable: false,
      writable: false,
      value: function (keys = []) {
        const Objects = keys.map(Key => ({Key}))
        const deletion = client.deleteObjects({
          Delete: {Objects}
        })
        return deletion.promise()
      }
    }
  })
  return client
}
/**
 * {
 *    keyId: '....',
 *    secretKey: '......',
 *    region: '...',
 *    bucket: '...',
 *    acl: 'public-read',
 *    cacheCtrl: 'max-age=604800'
 * }
 * 
 */
exports.name = 'AWS'
exports.version = '0.0.1'
exports.booting = true

exports.install = function (options) {
  if (!options || !options.keyId || !options.secretKey || !options.region || !options.bucket){
    throw new Error('Please configue AWS module')
  }
  global.S3Client = createS3Client(options.KeyId, options.secretKey, options.region, options.bucket)
}
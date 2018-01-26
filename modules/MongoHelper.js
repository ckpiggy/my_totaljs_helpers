const mongodb = require('mongodb')
const qs = require('querystring')
const F = global.F
const mongoErrorRegex = /MongoError: ([\w]+) ([\w\s:.{"-}]+)/
global.ObjectId = mongodb.ObjectId

exports.name = 'MongoHelper'
exports.version = '0.0.1'
exports.booting = true

exports.install = (options)=>{
  if (!options || !options.url) {
    throw new Error('need config mongodb url')
  }
  const url = options.url
  F.onParseQuery = function (str) {
    return qs.parse(str)
  }
  F.wait('mongodb')
  mongodb.MongoClient.connect(url, {w: 'majority', j: true, wtimeout: 200}, function (error, db) {
    if (error)
      throw error
    F.MongoDB = db
    F.wait('mongodb')
    F.emit('database', db)
  })
}

function intExtractor (source) {
  return Object.keys(source).reduce(function (res, key) {
    const add = {}
    add[key] = parseInt(source[key]) || source[key]
    return Object.assign({}, res, add)
  }, {})
}

function cursorOption (sort, project, skip, limit) {
  const option = {}
  if (sort){
    option.sort = intExtractor(sort)
  }
  if (project){
    option.project = intExtractor(project)
  }
  option.skip = parseInt(skip) || 0
  option.limit = parseInt(limit) || 10

  return option
}

function createCursor (collection, query, option) {
  let cursor = collection.find(query)

  option.sort && (cursor = cursor.sort(option.sort))
  option.project && (cursor = cursor.project(option.project))
  option.skip && (cursor = cursor.skip(option.skip))
  option.limit && (cursor = cursor.limit(option.limit))

  return cursor
}

function parsedMongoError (mongoError = {}) {
  const errGroup = mongoErrorRegex.exec(mongoError.toString())
  if (!errGroup) {
    return null
  }
  return {
    name: 'MongoError',
    error: errGroup[2],
    path: errGroup[1]
  }
}

exports.parsedMongoError = parsedMongoError


function composePaginationData (helper, baseURL, docs, count) {
  const pagination = {}
  const next_helper = Object.assign({}, helper)
  next_helper.page += 1
  pagination.next_page_url = docs.length < helper.per_page ? '' :
    baseURL + ctrl.url + '?' + qs.stringify(next_helper)

  const prev_helper = Object.assign({}, helper)
  prev_helper.page -= 1
  pagination.prev_page_url = helper.page === 1 ? '' :
    baseURL + ctrl.url + '?' + qs.stringify(prev_helper)

  pagination.total = count
  pagination.current_page = helper.page
  pagination.last_page = Math.ceil(count / helper.per_page)
  pagination.from = pagination.current_page * pagination.per_page + 1
  const estimateTo = (pagination.current_page + 1) * pagination.per_page
  if ( estimateTo > count) {
    pagination.to = count
  } else {
    pagination.to = estimateTo
  }
  return pagination
}

/**
 * @description The function will use `find` to get one record, please noted the controller must pass helper with structure like:
 * {
 *  sort: {
 *    keyA: 1,
 *    keyB: -1,
 *    keyC: 1
 *  },
 *  page: 1,
 *  per_page: 10,
 *  project: {
 *    keyA: 1,
 *    keyB: 1,
 *    keyC: 1
 *  }
 *  .
 *  .
 *  .
 *  other query fields
 * }
 * @param {function}  collection return a mongodb collection
 * @param {function} queryBuilder a function return query object, the parameters are [error, helper]
 * @param {string} baseURL the api baseURL, used to generate page information
 * @param {function} responseDelegate a function send response, the parameters are [error, result, controller]
 * */

function queryByFind (collection, queryBuilder, baseURL, responseDelegate) {
  return function find_schema_delegate(error, helper, callback, ctrl) {
    if (!helper){
      error.push('query error', 'no query helper')
      return responseDelegate(error, undefined, ctrl)
    }
    helper.page = parseInt(helper.page) || 1
    const per_page = parseInt(helper.per_page) || 10
    helper.per_page = per_page > 100 ? 100 : per_page

    const q = Object.assign({}, helper)
    delete q.sort
    delete q.page
    delete q.per_page
    delete q.project
    const query = queryBuilder(error, q)

    if (error.hasError('')){return responseDelegate(error, undefined, ctrl)}

    const c = {}
    c.sort = helper.sort
    c.project = helper.project
    c.skip = (helper.page - 1) * helper.per_page
    c.limit = helper.per_page
    const option = cursorOption(c.sort, c.project, c.skip, c.limit)
    const cursor = createCursor(collection(), query, option)

    Promise.all([cursor.toArray(), cursor.count()])
      .then((results)=>{
        const docs = results[0]
        const count = results[1]
        const pagination = composePaginationData(helper, baseURL, docs, count)
        const res = {
          links: {pagination},
          data: docs
        }
        return responseDelegate(error, res, ctrl)
      })
      .catch((err)=>{
        error.push(parsedMongoError(err))
        return responseDelegate(error, undefined, ctrl)
      })
  }
}

exports.schemaFind = queryByFind

/**
 * @description the function will use `aggregate` to query, the controller must pass helper with structure like:
 * {
 *  sort: {
 *    keyA: 1,
 *    keyB: -1,
 *    keyC: 1
 *  },
 *  page: 1,
 *  per_page: 10,
 *  project: {
 *    keyA: 1,
 *    keyB: 1,
 *    keyC: 1
 *  }
 *  .
 *  .
 *  .
 *  other query fields
 * }
 * @param {function}  collection return a mongodb collection
 * @param {function} pipelineBuilder a function return query object, the parameters are [error, helper]
 * @param {string} baseURL the api baseURL, used to generate page information
 * @param {function} responseDelegate a function send response, the parameters are [error, result, controller]
 * */

function queryByAggregate (collection, pipelineBuilder, baseURL, responseDelegate) {
  return function aggregate_schema_delegate(error, helper, cb, ctrl) {
    if (!helper){
      error.push('query error', 'no query helper')
      return responseDelegate(error, undefined, ctrl)
    }
    helper.page = parseInt(helper.page) || 1
    const per_page = parseInt(helper.per_page) || 10
    helper.per_page = per_page > 100 ? 100 : per_page
    helper.sort && (helper.sort = intExtractor(helper.sort))
    helper.project && (helper.project = intExtractor(helper.project))

    const pipeline = pipelineBuilder(error, helper)

    if (error.hasError('')){
      return responseDelegate(error, undefined, ctrl)
    }

    const cursor = collection().aggregate(pipeline)

    Promise.all([cursor.toArray(), cursor.count()])
      .then((results)=>{
        const docs = results[0]
        const count = results[1]
        const pagination = composePaginationData(helper, baseURL, docs, count)
        const res = {
          links: {pagination},
          data: docs
        }
        return responseDelegate(error, res, ctrl)
      })
      .catch((err)=>{
        error.push(parsedMongoError(err))
        return responseDelegate(error, undefined, ctrl)
      })
  }
}

exports.schemaAggregate = queryByAggregate



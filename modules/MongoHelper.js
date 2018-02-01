const mongodb = require('mongodb')
const qs = require('querystring')
const Url = require('url')
const F = global.F
const mongoErrorRegex = /MongoError: ([\w]+) ([\w\s:,.{"-}]+)/
const {IncomingMessage} = require('http')
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
  mongodb.MongoClient.connect(url, {w: 'majority', j: true, wtimeout: 200}, function (error, client) {
    if (error)
      throw error
    const urlObj = Url.parse(url)
    const dbName = urlObj.pathname.replace('/', '')
    F.MongoDB = client.db(dbName)
    F.wait('mongodb')
    F.emit('database', F.MongoDB)
  })
}

exports.createMongoQuery = function createMongoQuery (qsObject) {
  const query = {}
  /**
   * @typedef {Function} QueryValueHandler
   * @param {String|Array|Object} qsValue - value from object which is parsed from query string
   * @return  value - the query value
   * */

  /**
   * Update mongodb query object
   * @param {String} key - the query key
   * @param {QueryValueHandler} updateHandler
   *
   * */
  query.queryKey = function (key = '', updateHandler = null) {
    const qsVal = qsObject[key]
    if (!key || !qsVal) {
      return query
    }
    if (updateHandler) {
      query[key] = updateHandler(qsVal)
    } else {
      query[key] = qsVal
    }
    return query
  }
  return query
}


/**
 * @typedef {String[]} SortProjectArray
 * @description a string array represent key-value pairs separate by ':'
 * @example
 * // a sort object {name: 1, date: -1}
 * ['name:1', 'date:-1']
 * */

/**
 * Extract keys and values from sort, project array
 * @param {SortProjectArray} arr - a string array
 * @return {Object} sort/project - the sort or project object
 */

function extractSortOrProject (arr = []) {
  if (!arr || !arr.length) {
    return null
  }
  if (typeof arr === 'string') {
    arr = [arr]
  }
  const data = {}
  arr.forEach((val) => {
    const pair = val.split(':')
    if (pair.length === 2) {
      data[pair[0]] = parseInt(pair[1])
    }
  })
  return data
}

/**
 * @typedef {Object} QueryOption
 * @property {Object} [sort] - results sort directions ex : {keyA: 1, keyB: -1}
 * @property {Object} [project] - only return certain keys ex: {keyA: 1, keyB: 1}
 * @property {Number} skip - skip amount of data
 * @property {Number} limit - total count limit of the query = skip + expect number of results
 * */

/**
 * Parse query string object and extract query and option
 * @param {SortProjectArray} sort - sort array from query object
 * @param {SortProjectArray} project - project array from query object
 * @param {String} page - current page
 * @param {String} per_page - documents per page
 * @return {QueryOption} option - query option
 * */

exports.cursorOption = function cursorOption (sort = null, project = null, page = '1', per_page = '10') {
  const option = {}
  const curPage = parseInt(page)
  const perPage = parseInt(per_page)
  option.sort = extractSortOrProject(sort)
  option.project = extractSortOrProject(project)
  option.skip = (curPage - 1) * perPage
  option.limit = option.skip + perPage
  return option
}

/**
 * Create mongodb Collection~Cursor
 * @param {Object} collection - Mongodb Collection
 * @param {Object} query - mongodb query object
 * @param {QueryOption} option - query option
 * @return {Object} cursor - mongodb collection cursor
 * */


exports.createFindCursor = function createFindCursor (collection, query, option) {
  let cursor = collection.find(query)
  option.sort && (cursor = cursor.sort(option.sort))
  option.project && (cursor = cursor.project(option.project))
  option.limit && (cursor = cursor.limit(option.limit))
  option.skip && (cursor = cursor.skip(option.skip))
  return cursor
}

/**
 * A helper to extract mongo error code and error message and generate totaljs error object
 * @param {Object} mongoError - the mogodb driver generated error
 * @return {Object} totaljsError - the parsed totaljs error
 * */

exports.parsedMongoError = function parsedMongoError (mongoError = {}) {
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

/**
 * @typedef {Object} PaginationData
 * @property {String} next_page_url - the url to query next page
 * @property {String} prev_page_url - the url to query prev page
 * @property {Number} total - total count of results
 * @property {Number} current_page - current page number
 * @property {Number} last_page - the last page number
 * @property {Number} from - current page data is from ...
 * @property {Number} to - current page data is to ...
 *
 * */

/**
 * help user to generate pagination data
 * @param {Object} qsObject - the object from total.js query
 * @param {String} urlString - the request url http.incommingMessage.url
 * @param {Number} count - total count
 * @return {PaginationData} pagination
 * */

function composePaginationData (qsObject = {}, req, count = 0) {
  if (!req || !req.headers || !req.connection) {
    throw Error('need request to compose data')
  }
  const protocol = req.connection.encrypted || req.headers['x-forwarded-proto'] ? 'https:' : 'http:'
  const baseUrl = `${protocol}//${req.headers.host}${req.url}`
  const pagination = {}
  pagination.total = count
  pagination.current_page = qsObject.page
  pagination.last_page = Math.ceil(count / qsObject.per_page)
  pagination.from = pagination.current_page * pagination.per_page + 1

  const next_helper = Object.assign({}, qsObject)
  next_helper.page = parseInt(next_helper.page) + 1
  pagination.next_page_url = next_helper.page > pagination.last_page ? '' : baseUrl + '?' + qs.stringify(next_helper)

  const prev_helper = Object.assign({}, qsObject)
  prev_helper.page = parseInt(next_helper.page) - 1
  pagination.prev_page_url = qsObject.page === 1 ? '' : baseUrl + '?' + qs.stringify(prev_helper)

  const estimateTo = (pagination.current_page + 1) * pagination.per_page
  if ( estimateTo > count) {
    pagination.to = count
  } else {
    pagination.to = estimateTo
  }
  return pagination
}

exports.composePagination = composePaginationData

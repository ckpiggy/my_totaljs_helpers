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
 * @property {Object} sort - results sort directions ex : {keyA: 1, keyB: -1}
 * @property {Object} project - only return certain keys ex: {keyA: 1, keyB: 1}
 * @property {Number} skip - skip amount of data
 * @property {Number} limit - total count limit of the query = skip + expect number of results
 * */

/**
 * Parse query string object and extract query and option
 * @param {SortProjectArray} sort - sort array from query object
 * @param {SortProjectArray} project - project array from query object
 * @param {Number} page - current page
 * @param {Number} per_page - documents per page
 * @return {QueryOption} option - query option
 * */

exports.cursorOption = function cursorOption (sort = null, project = null, page = 1, per_page = 10) {
  const option = {}
  option.sort = extractSortOrProject(sort)
  option.project = extractSortOrProject(project)
  option.skip = (page - 1) * per_page
  option.limit = option.skip + per_page
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
 * @param {String} url - the request url (not include query string)
 * @param {Array} docs - the result documents
 * @param {Number} count - total count
 * @return {PaginationData} pagination
 * */

function composePaginationData (qsObject = {}, url = '', docs = [], count = 0) {
  const pagination = {}
  const next_helper = Object.assign({}, qsObject)
  next_helper.page += 1
  pagination.next_page_url = docs.length < qsObject.per_page ? '' : url + '?' + qs.stringify(next_helper)

  const prev_helper = Object.assign({}, qsObject)
  prev_helper.page -= 1
  pagination.prev_page_url = qsObject.page === 1 ? '' : url + '?' + qs.stringify(prev_helper)

  pagination.total = count
  pagination.current_page = qsObject.page
  pagination.last_page = Math.ceil(count / qsObject.per_page)
  pagination.from = pagination.current_page * pagination.per_page + 1
  const estimateTo = (pagination.current_page + 1) * pagination.per_page
  if ( estimateTo > count) {
    pagination.to = count
  } else {
    pagination.to = estimateTo
  }
  return pagination
}

exports.composePagination = composePaginationData

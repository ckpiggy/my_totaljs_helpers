const mongodb = require('mongodb'), F = global.F, qs = require('qs')
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

/**
 * @description The helper function will use `insertOne` to create record
 * @param {function} collection return a mongodb collection
 * @param {function} dataBuilder a function return update object, the parameters are [error, model, helper]
 * @param {function} optionBuilder a function return option object, the parameters are [error, model, helper]
 * @param {function} responseDelegate a function send response, the parameters are [error, result, controller]
 *
 * */

function create(collection, dataBuilder, optionBuilder, responseDelegate) {
  return function create_schema_delegate(error, model, helper, cb, ctrl) {
    const m = Object.assign({}, model.$clean()),
      data = dataBuilder(error, Object.assign({}, m), helper),
      option =  optionBuilder(error, m, helper)

    if (error.hasError('')){
      return responseDelegate(error, undefined, ctrl)
    }
    collection().insertOne(data, option)
      .then((result)=>{
        return responseDelegate(error, result, ctrl)
      })
      .catch((err)=>{
        error.push('mongodb error', err.toString())
        return responseDelegate(error, undefined, ctrl)
      })
  }
}

exports.schemaCreate = create

/**
 * @description The helper function will use `findOneAndUpdate` to save data
 * @param {function}  collection return a mongodb collection
 * @param {function} queryBuilder a function return query object, the parameters are [error, model, helper]
 * @param {function} dataBuilder a function return update object, the parameters are [error, model, helper]
 * @param {function} optionBuilder a function return option object, the parameters are [error, model, helper]
 * @param {function} responseDelegate a function send response, the parameters are [error, result, controller]
 *
 * */

function save(collection, queryBuilder, dataBuilder, optionBuilder, responseDelegate) {
  return function save_schema_delegate(error, model, helper, cb, ctrl) {
    const m = Object.assign({}, model.$clean()),
      query = queryBuilder(error, Object.assign({}, m), helper),
      data = dataBuilder(error, Object.assign({}, m), helper),
      option =  optionBuilder(error, m, helper)
    if (error.hasError('')){
      return responseDelegate(error, undefined, ctrl)
    }
    collection().findOneAndUpdate(query, data, option)
      .then((result) => {
        return responseDelegate(error, result, ctrl)
      })
      .catch((err) => {
        error.push('mongodb error', err.toString())
        return responseDelegate(error, undefined, ctrl)
      })
  }
}

exports.schemaSave = save

/**
 * @description The helper function will use `findOne` to get one record
 * @param {function}  collection return a mongodb collection
 * @param {function} queryBuilder a function return query object, the parameters are [error, model, helper]
 * @param {function} optionBuilder a function return option object, the parameters are [error, model, helper]
 * @param {function} responseDelegate a function send response, the parameters are [error, result, controller]
 * */

function getOne (collection, queryBuilder, optionBuilder, responseDelegate) {
  return function get_schema_delegate(error, model, helper, cb, ctrl) {
    const query = queryBuilder(error, Object.assign({}, model.$clean()), helper),
      option = optionBuilder(error, Object.assign({}, model.$clean()), helper)

    if (error.hasError('')){
      return responseDelegate(error, undefined, ctrl)
    }
    collection().findOne(query, option)
      .then((result)=>{
        return responseDelegate(error, result, ctrl)
      })
      .catch((err)=>{
        error.push('mongodb error', err.toString())
        return responseDelegate(error, undefined, ctrl)
      })
  }
}

exports.schemaGet = getOne

/**
 * @description The function will use `find` to get one record, please noted the controller must pass helper with structure like:
 * {
 *  sort,
 *  page,
 *  per_page,
 *  project
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

    const pagination = {},
      q = Object.assign({}, helper)
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

    cursor.toArray()
      .then((docs)=>{
        const next_helper = Object.assign({}, helper)
        next_helper.page += 1
        pagination.next_page_url = docs.length < helper.per_page ? '' :
          baseURL + ctrl.url + '?' + qs.stringify(next_helper)
        const prev_helper = Object.assign({}, helper)
        prev_helper.page -= 1
        pagination.prev_page_url = helper.page === 1 ? '' :
          baseURL + ctrl.url + '?' + qs.stringify(prev_helper)
        const res = {
          links: {pagination},
          data: docs
        }
        return responseDelegate(error, res, ctrl)
      })
      .catch((err)=>{
        error.push('mongodb error', err.toString())
        return responseDelegate(error, undefined, ctrl)
      })
  }
}

exports.schemaFind = queryByFind

/**
 * @description the function will use `aggregate` to query, the controller must pass helper with structure like:
 * {
 *  sort,
 *  page,
 *  per_page,
 *  project
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

    collection().aggregate(pipeline).toArray()
      .then((docs)=>{
        const pagination = {}
        const next_helper = Object.assign({}, helper)
        next_helper.page += 1
        pagination.next_page_url = docs.length < helper.per_page ? '' :
          baseURL + ctrl.url + '?' + qs.stringify(next_helper)
        const prev_helper = Object.assign({}, helper)
        prev_helper.page -= 1
        pagination.prev_page_url = helper.page === 1 ? '' :
          baseURL + ctrl.url + '?' + qs.stringify(prev_helper)
        const res = {
          links: {pagination},
          data: docs
        }
        return responseDelegate(error, res, ctrl)
      })
      .catch((err)=>{
        error.push('mongodb error', err.toString())
        return responseDelegate(error, undefined, ctrl)
      })
  }
}

exports.schemaAggregate = queryByAggregate

/**
 * @description the function will use `findOneAndDelete` to delete
 * @param {function}  collection return a mongodb collection
 * @param {function} queryBuilder a function return query object, the parameters are [error, helper]
 * @param {function} optionBuilder a function return option object, the parameters are [error, helper]
 * @param {function} responseDelegate a function send response, the parameters are [error, result, controller]
 * */

function deleteOne (collection, queryBuilder, optionBuilder, responseDelegate) {
  return function delete_schema_delegate(error, helper, cb, ctrl) {
    const query = queryBuilder(error, helper),
      option = optionBuilder(error, helper)

    if (error.hasError('')){
      return responseDelegate(error, undefined, ctrl)
    }

    collection().findOneAndDelete(query, option)
      .then((result)=>{
        return responseDelegate(error, result, ctrl)
      })
      .catch((err)=>{
        error.push('mongodb error', err.toString())
        return responseDelegate(error, undefined, ctrl)
      })
  }
}

exports.schemaDelete = deleteOne

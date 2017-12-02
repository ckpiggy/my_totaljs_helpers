exports.name = 'MongoSchema'
exports.version = '0.0.1'


function cursorOption (sort, project, skip, limit) {
  const option = {}

  function intExtractor (source) {
    return Object.keys(source).reduce(function (res, key) {
      const add = {}
      add[key] = parseInt(source[key]) || source[key]
      return Object.assign({}, res, add)
    }, {})
  }

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
 * @description The helper function will use insertOne to create record
 * @param {object} collection a mongodb collection
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
    collection.insertOne(data, option)
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
 * @description The helper function will use findOneAndUpdate to save data
 * @param {object} collection a mongodb collection
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
    collection.findOneAndUpdate(query, data, option)
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
 * @description The helper function will use findOne to get one record
 * @param {object} collection a mongodb collection
 * @param {function} queryBuilder a function return query object, the parameters are [error, model, helper]
 * @param {function} optionBuilder a function return option object, the parameters are [error, model, helper]
 * @param {function} responseDelegate a function send response, the parameters are [error, result, controller]
 * */

function getOne (collection, queryBuilder, optionBuilder, responseDelegate) {
  return function (error, model, helper, cb, ctrl) {
    const query = queryBuilder(error, Object.assign({}, model.$clean()), helper),
      option = optionBuilder(error, Object.assign({}, model.$clean()), helper)
    if (error.hasError('')){
      return responseDelegate(error, undefined, ctrl)
    }
    collection.findOne(query, option)
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






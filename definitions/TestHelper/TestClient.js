const F = global.framework
if (F.isTest) {
  const axios = require('axios')

  F.testClient = axios.create({
    baseURL: 'http://localhost:8000'
  })
}

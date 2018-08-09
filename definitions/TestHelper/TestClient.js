const F = global.framework

exports.install = () => {
  if (F.isTest) {
    const axios = require('axios')
  
    F.testClient = axios.create({
      baseURL: 'http://localhost:8000'
    })
  }
}


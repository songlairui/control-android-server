import * as mocha from 'mocha'
import * as chai from 'chai'
import chaiHttp = require('chai-http')

import app from '../src/App'

chai.use(chaiHttp)
const expect = chai.expect

describe('Adb Api Test', () => {
  it('should return a single JSON Object', () =>
    chai
      .request(app)
      .get('/api/adb/devices')
      .then(res => {
        expect(res).to.be.an('object')
      }))
})

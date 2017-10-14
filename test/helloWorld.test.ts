import * as mocha from 'mocha'
import * as chai from 'chai'
const chaiHttp = require('chai-http')

import app from '../src/App'

chai.use(chaiHttp)
const expect = chai.expect

describe('baseRoute', () => {
  it('should be a json ', () =>
    chai
      .request(app)
      .get('/')
      .then(res => {
        expect(res.type).to.eql('application/json')
      }))

  it('should be a message prop', () =>
    chai
      .request(app)
      .get('/')
      .then(res => {
        expect(res.body.message).to.eql('hello World')
      }))
})

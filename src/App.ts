import * as path from 'path'
import * as logger from 'morgan'
import * as express from 'express'
import * as cors from 'cors'
import * as bodyParser from 'body-parser'

import HeroRouter from './routes/HeroRouter'
import AdbRouter from './routes/AdbRouter'

class App {
  public express: express.Application
  constructor() {
    this.express = express()
    this.middleware()
    this.routes()
  }

  private middleware(): void {
    this.express.use(logger('dev'))
    this.express.use(bodyParser.json())
    this.express.use(bodyParser.urlencoded({ extended: false }))
  }
  private routes(): void {
    let router = express.Router()
    router.get('/', (req, res, next) => {
      res.json({
        message: 'hello World'
      })
    })
    var corsOption = {
      origin: true,
      methods: ['GET', 'POST'],
      // credentials: true,
      maxAge: 3600
    }
    this.express.use('/', router)
    this.express.use('/api/v1/heroes', HeroRouter)
    this.express.use('/api/adb', cors(corsOption), AdbRouter)
  }
}

export default new App().express

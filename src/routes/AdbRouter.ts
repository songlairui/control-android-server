import { Router, Request, Response, NextFunction } from 'express'
import {
  listDevices,
  listPidsByComm,
  killProcsByComm,
  startMinicap
} from '../util/devutil'
import {
  getDevices,
  deploy,
  start,
  stop,
  checkRunning,
  forward,
  closeRotatorMonitor,
  getRotatorMonitor
} from '../util/adbutil'

import * as util from 'util'
import * as path from 'path'
import * as adb from 'adbkit'
let client = adb.createClient()

export class AdbRouter {
  router: Router
  constructor() {
    this.router = Router()
    this.init()
  }

  public async getDevices(req: Request, res: Response, next: NextFunction) {
    let { err, devices } = await getDevices()
    if (err) {
      res.status(404).send({
        message: err,
        code: res.status
      })
    } else {
      res.status(200).send({
        message: 'devices here',
        code: res.status,
        devices
      })
    }
  }
  public async deploy(req: Request, res: Response, next: NextFunction) {
    let { err, result } = await deploy()

    res.status(200).send({
      result
    })
  }
  public async stop(req: Request, res: Response, next: NextFunction) {
    let { err, result } = await stop()
    res.status(200).send({
      result
    })
  }

  public async checkRunning(req: Request, res: Response, next: NextFunction) {
    let { err, result } = await checkRunning()
    res.status(200).send({
      result
    })
  }
  public async start(req: Request, res: Response, next: NextFunction) {
    let { err, result } = await start({ orientation: '90' })
    res.status(200).send({
      result
    })
  }
  public async forward(req: Request, res: Response, next: NextFunction) {
    let result = await forward()
    res.status(200).send({
      result
    })
  }

  public async getRotatorMonitor(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    await getRotatorMonitor()
    res.send({
      message: '[exec] getRotatorMonitor'
    })
  }

  public async closeRotatorMonitor(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    await closeRotatorMonitor()
    res.send({
      message: 'exec closeRotatorMonitor '
    })
  }

  init() {
    this.router.get('/devices', this.getDevices)
    this.router.get('/deploy', this.deploy)
    this.router.get('/stop', this.stop)
    this.router.get('/start', this.start)
    this.router.get('/startM', this.getRotatorMonitor)
    this.router.get('/stopM', this.closeRotatorMonitor)
    this.router.get('/checkRunning', this.checkRunning)
    this.router.get('/forward', this.forward)
  }
}

const adbRouter = new AdbRouter()
adbRouter.init()

export default adbRouter.router

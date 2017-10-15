import { Router, Request, Response, NextFunction } from 'express'
import { listDevices, listPidsByComm, killProcsByComm } from '../util/devutil'

import * as adb from 'adbkit'
import * as util from 'util'
import * as path from 'path'
let client = adb.createClient()

let tracedDevices = null

export class AdbRouter {
  router: Router
  constructor() {
    this.router = Router()
    this.init()
  }

  public async getDevices(req: Request, res: Response, next: NextFunction) {
    let devices = await listDevices(client)
    if (devices) {
      tracedDevices = devices
      res.status(200).send({
        message: 'devices here',
        code: res.status,
        devices
      })
    } else {
      tracedDevices = null
      res.status(404).send({
        message: 'no devices',
        code: res.status
      })
    }
  }
  public async deploy(req: Request, res: Response, next: NextFunction) {
    let device = (tracedDevices || (await listDevices(client)))[0]
    console.info('[device]: ', device)
    let abi = device.abi
    let resources = [
      {
        src: path.resolve(
          __dirname,
          '../../node_modules',
          util.format(
            'minicap-prebuilt/prebuilt/%s/bin/minicap%s',
            abi.primary,
            abi.pie ? '' : '-nopie'
          )
        ),
        dest: '/data/local/tmp/minicap',
        mode: 0o0755
      },
      {
        src: path.resolve(
          __dirname,
          '../../node_modules',
          util.format(
            'minicap-prebuilt/prebuilt/%s/lib/android-%s/minicap.so',
            abi.primary,
            device.sdk
          )
        ),
        dest: '/data/local/tmp/minicap.so',
        mode: 0o0755
      },
      {
        src: path.resolve(
          __dirname,
          '../../node_modules',
          util.format(
            'minirev/%s/minirev%s',
            abi.primary,
            abi.pie ? '' : '-nopie'
          )
        ),
        dest: '/data/local/tmp/minirev',
        mode: 0o0755
      },
      {
        src: path.resolve(
          __dirname,
          '../../node_modules',
          util.format(
            'minitouch-prebuilt/prebuilt/%s/bin/minitouch%s',
            abi.primary,
            abi.pie ? '' : '-nopie'
          )
        ),
        dest: '/data/local/tmp/minitouch',
        mode: 0o0755
      }
    ]
    let result = await Promise.all(
      resources.map(async resource => {
        return await client
          .push(device.id, resource.src, resource.dest, resource.mode)
          .timeout(10000)
          .then(function(transfer) {
            console.info('[transfering],', transfer)
            return new Promise((resolve, reject) => {
              transfer.on('error', reject)
              transfer.on('end', () => resolve('ok'))
            })
          })
          .then(data => {
            console.info('[transfer result]:', data)
            return data
          })
          .catch(e => {
            return e.toString()
          })
      })
    )
    res.status(200).send({
      result
    })
  }
  public async stop(req: Request, res: Response, next: NextFunction) {
    let device = (tracedDevices || (await listDevices(client)))[0]
    if (!device)
      return res.status(400).send({ message: 'no device', status: res.status })
    let result = await killProcsByComm(
      client,
      device.id,
      '',
      '/data/local/tmp/minicap',
      ''
    )
    res.status(200).send({
      result
    })
  }

  public async checkRunning(req: Request, res: Response, next: NextFunction) {
    let device = (tracedDevices || (await listDevices(client)))[0]
    if (!device)
      return res.status(400).send({ message: 'no device', status: res.status })
    let result = await listPidsByComm(
      client,
      device.id,
      '',
      '/data/local/tmp/minicap'
    )
    res.status(200).send({
      result
    })
  }
  public async start(req: Request, res: Response, next: NextFunction) {
    let device = (tracedDevices || (await listDevices(client)))[0]
    if (!device)
      return res.status(400).send({ message: 'no device', status: res.status })
    await killProcsByComm(client, device.id, '', '/data/local/tmp/minicap', '')
    console.info('start to start')
    let command = util.format(
      'LD_LIBRARY_PATH=%s exec %s %s',
      path.dirname('/data/local/tmp/minicap.so'),
      '/data/local/tmp/minicap',
      '-P 540x960@540x960/0'
    )
    let result = await client.shell(device.id, command).then(out => {
      return new Promise((resolve, reject) => {
        let datachunk = ''
        out.on('data', chunk => {
          // console.info('[chunk]')
          datachunk += chunk
        })
        out.on('end', () => {
          resolve({ datachunk })
        })
        out.on('error', error => {
          reject({ error, command: command })
        })
        setTimeout(() => {
          resolve({ message: 'there is no error in 100ms', code: 0 })
        }, 100)
      })
    })
    res.status(200).send({
      result
    })
  }
  public async forward(req: Request, res: Response, next: NextFunction) {}
  init() {
    this.router.get('/devices', this.getDevices)
    this.router.get('/deploy', this.deploy)
    this.router.get('/stop', this.stop)
    this.router.get('/start', this.start)
    this.router.get('/checkRunning', this.checkRunning)
    this.router.get('/forward', this.forward)
  }
}

const adbRouter = new AdbRouter()
adbRouter.init()
export default adbRouter.router

import { Router, Request, Response, NextFunction } from 'express'
import {
  listDevices,
  listPidsByComm,
  killProcsByComm,
  startMinicap,
  startMiniTouch
} from '../util/devutil'

import * as util from 'util'
import * as path from 'path'
import * as adb from 'adbkit'
const KeyMap = require('./android_key.json')

let client = adb.createClient()

let tracedDevices = null
const status = {
  tryingStart: false,
  tryingStartTouch: false
}

export async function getDevices() {
  let err
  let devices = await listDevices(client)
  if (devices) {
    tracedDevices = devices
    return { err, devices }
  } else {
    tracedDevices = null
    return { err: 'no devices', devices }
  }
}
export async function deploy() {
  let device = (tracedDevices || (await listDevices(client)))[0]
  let abi = device.abi
  let err = null
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
        '../../vendor',
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
  return { err, result }
}
export async function stop() {
  let device = (tracedDevices || (await listDevices(client)))[0]
  let err = null
  if (!device)
    return {
      err: new Error('no device'),
      result: null
    }
  let result = await killProcsByComm(
    client,
    device.id,
    '',
    '/data/local/tmp/minicap',
    ''
  )
  status.tryingStart = false
  return { err, result }
}

export async function checkRunning() {
  let err
  let device = (tracedDevices || (await listDevices(client)))[0]
  if (!device)
    return {
      err: new Error('no device'),
      result: null
    }
  let result = await listPidsByComm(
    client,
    device.id,
    '',
    '/data/local/tmp/minicap'
  )
  return { err, result }
}
export async function start({ orientation }) {
  let err, result
  if (status.tryingStart) {
    console.info('trying start')
    return {
      message: 'already trying',
      result,
      err
    }
  }
  status.tryingStart = true

  result = await startMinicap({ status, tracedDevices, client, orientation })
  status.tryingStart = false
  return { err, result }
}

export async function startTouch() {
  let err, result
  if (status.tryingStartTouch) {
    console.info('trying start')
    return {
      message: 'already trying',
      result,
      err
    }
  }
  status.tryingStartTouch = true
  result = await startMiniTouch({ status, tracedDevices, client })
  status.tryingStartTouch = false
  return { err, result }
}
export async function forward() {
  return {
    message: 'will use openLocal do forward without port'
  }
}

export async function closeRotatorMonitor() {
  let device = (tracedDevices || (await listDevices(client)))[0]
  return killProcsByComm(client, device.id, '', 'app_process', '')
}

export async function getRotatorMonitor() {
  await closeRotatorMonitor()
  let device = (tracedDevices || (await listDevices(client)))[0]
  let apk_path = /\/.*\.apk/.exec(
    (await client
      .shell(device.id, `pm path jp.co.cyberagent.stf.rotationwatcher`)
      .then(adb.util.readAll)).toString()
  )[0]
  if (!apk_path) return console.error('no apk_path,', apk_path)
  let command = `export CLASSPATH="${apk_path}";exec app_process /system/bin jp.co.cyberagent.stf.rotationwatcher.RotationWatcher`
  // let out = await client.shell(device.id, command)
  // treatOut(out)
  return client.shell(device.id, command)
}

export async function sendKey(keyname) {
  let device = (tracedDevices || (await listDevices(client)))[0]

  let keyCode = KeyMap[`KEYCODE_${keyname.toUpperCase()}`]
  if (keyname === 'back') {
    keyCode = 196
    client.shell(
      device.id,
      `sendevent /dev/input/event4 1 ${keyCode} 1 && sendevent /dev/input/event4 0 0 0 && sendevent /dev/input/event4 1 ${keyCode} 0 && sendevent /dev/input/event4 0 0 0`
    )
  } else {
    client.shell(device.id, `input keyevent ${keyCode}`)
  }
  // for (let i = 0; i <= 7; i++) {
  //   console.info(' -------    send via event' + i)

  // }
}

function treatOut(out) {
  // out.on('readable', () => {
  //   let data = out.read()
  //   if (data) {
  //     console.info('OUTPUT:', data.toString())
  //   } else {
  //     console.info(null)
  //   }
  // })
  out.on('close', () => {
    console.info('[RotatorMonitor ] close')
  })
}

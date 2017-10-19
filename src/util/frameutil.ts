import * as net from 'net'
import { listDevices, listPidsByComm, killProcsByComm } from '../util/devutil'

import * as adb from 'adbkit'
let client = adb.createClient()

export async function wssConnect(ws) {
  let mark = {
    lastTimeStamp: null,
    stream: null
  }
  mark.stream = mark.stream || (await liveStream({ ws, mark }))
  ws.on('close', function() {
    console.info('------ CLOSED ws  ----- :', ws === null, mark.stream === null)
    mark.lastTimeStamp = null
    console.info('Lost a client', ws.readyState)
    ws = null
    console.info('ws cleared', ws !== null && ws.readyState)
    if (mark.stream) mark.stream.end()
  })
}

async function liveStream({ ws, mark }) {
  console.info('Got a client')
  let device = (await listDevices(client))[0]
  if (!device) {
    console.info('no devices')
    ws.close()
    return
  } else {
    console.info('device got')
  }
  var { err, stream } = await client
    .openLocal(device.id, 'localabstract:minicap')
    .timeout(10000)
    .then(out => ({ stream: out }))
    .catch(err => ({ err }))
  if (err) {
    console.info('socket error, Retry within .2 second!!!')
    await new Promise(resolve => setTimeout(resolve, 200))
    if (!ws) {
      return console.info('[[ ws 已关闭，无须重启 ]]')
    }
    mark.stream = await liveStream({ ws, mark })
    return
  }
  // var stream = net.connect({
  //   port: 1313
  // })
  stream.on('error', function() {
    console.error('Be sure to run `adb forward tcp:1313 localabstract:minicap`')
    process.exit(1)
  })

  var readBannerBytes = 0
  var bannerLength = 2
  var readFrameBytes = 0
  var frameBodyLength = 0
  var frameBody = Buffer.from([])
  var banner = {
    version: 0,
    length: 0,
    pid: 0,
    realWidth: 0,
    realHeight: 0,
    virtualWidth: 0,
    virtualHeight: 0,
    orientation: 0,
    quirks: 0
  }

  let i = 0
  function tryRead() {
    for (var chunk; (chunk = stream.read()); ) {
      for (var cursor = 0, len = chunk.length; cursor < len; ) {
        if (readBannerBytes < bannerLength) {
          switch (readBannerBytes) {
            case 0:
              // version
              banner.version = chunk[cursor]
              break
            case 1:
              // length
              banner.length = bannerLength = chunk[cursor]
              break
            case 2:
            case 3:
            case 4:
            case 5:
              // pid
              banner.pid += (chunk[cursor] << ((readBannerBytes - 2) * 8)) >>> 0
              break
            case 6:
            case 7:
            case 8:
            case 9:
              // real width
              banner.realWidth +=
                (chunk[cursor] << ((readBannerBytes - 6) * 8)) >>> 0
              break
            case 10:
            case 11:
            case 12:
            case 13:
              // real height
              banner.realHeight +=
                (chunk[cursor] << ((readBannerBytes - 10) * 8)) >>> 0
              break
            case 14:
            case 15:
            case 16:
            case 17:
              // virtual width
              banner.virtualWidth +=
                (chunk[cursor] << ((readBannerBytes - 14) * 8)) >>> 0
              break
            case 18:
            case 19:
            case 20:
            case 21:
              // virtual height
              banner.virtualHeight +=
                (chunk[cursor] << ((readBannerBytes - 18) * 8)) >>> 0
              break
            case 22:
              // orientation
              banner.orientation += chunk[cursor] * 90
              break
            case 23:
              // quirks
              banner.quirks = chunk[cursor]
              break
          }

          cursor += 1
          readBannerBytes += 1

          if (readBannerBytes === bannerLength) {
            console.log('[chunk 1]banner', banner)
          }
        } else if (readFrameBytes < 4) {
          frameBodyLength += (chunk[cursor] << (readFrameBytes * 8)) >>> 0
          cursor += 1
          readFrameBytes += 1
          // console.info(
          //   '[chunk 2]headerbyte%d(val=%d)',
          //   readFrameBytes,
          //   frameBodyLength
          // )
        } else {
          if (len - cursor >= frameBodyLength) {
            // console.info(
            //   '[chunk 3]bodyfin(len=%d,cursor=%d)',
            //   frameBodyLength,
            //   cursor
            // )

            frameBody = Buffer.concat([
              frameBody,
              chunk.slice(cursor, cursor + frameBodyLength)
            ])

            // Sanity check for JPG header, only here for debugging purposes.
            if (frameBody[0] !== 0xff || frameBody[1] !== 0xd8) {
              console.error(
                'Frame body does not start with JPG header',
                frameBody
              )
              process.exit(1)
            }

            let currentTimeStamp = +new Date()
            // if (lastTimeStamp) {
            if (
              !mark.lastTimeStamp ||
              currentTimeStamp - mark.lastTimeStamp > 20
            ) {
              // console.info('| delta > 30 |')
              mark.lastTimeStamp = currentTimeStamp
              // 前边有 异步过程， 这里重新判断一下 ws
              if (ws && ws.readyState === 1) {
                ws.send(frameBody, {
                  binary: true
                })
              } else {
                console.info('ws has closed when TRYREAD')
                stream.end()
              }
            } else {
              console.info('skip a frame ------- ')
            }
            // } else {
            // }

            cursor += frameBodyLength
            frameBodyLength = readFrameBytes = 0
            frameBody = Buffer.from([])
          } else {
            // console.info('[chunk 4]body(len=%d)', len - cursor)

            frameBody = Buffer.concat([frameBody, chunk.slice(cursor, len)])

            frameBodyLength -= len - cursor
            readFrameBytes += len - cursor
            cursor = len
          }
        }
      }
    }
  }
  stream.on('readable', tryRead)
  stream.on('close', async () => {
    console.info('socket Stream Closed ', ws.readyState)
    mark.stream = null
    if (!ws || ws.readyState !== 1) return
    mark.stream = await liveStream({ ws, mark })
  })
  return stream
}

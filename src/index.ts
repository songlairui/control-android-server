import * as http from 'http'
import * as debug from 'debug'

import { Server as WebSocketServer } from 'ws'
import * as net from 'net'

import App from './App'
import { liveStream, getTouchSocket } from './util/frameutil'
import { sendKey } from './util/adbutil'
import { sideServ } from './sideServ'

debug('ts-express:server')

const port = normalizePort(process.env.PORT || 3001)
App.set('port', port)

const server = http.createServer(App)
var wss = new WebSocketServer({ server: server })

let mark = {
  lastTimeStamp: null,
  stream: null,
  touchSocket: null,
  orientation: '0'
}
void (async function() {
  mark.touchSocket = await getTouchSocket({ mark })
})()

wss.on('connection', wssConnect)

server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

sideServ(mark)

function normalizePort(val: number | string): number | string | boolean {
  let port: number = +val
  if (isNaN(port)) return val
  if (port >= 0) return port
  return false
}

function onError(err: NodeJS.ErrnoException): void {
  if (err.syscall === 'listen') throw err
  let bind = (typeof port === 'string' ? 'Pipe ' : 'Port ') + port
  switch (err.code) {
    case 'EACCES':
      console.error(`${bind} requires elevated privileges`)
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(`${bind} is already in use`)
      process.exit(1)
      break
    default:
      throw err
  }
}

function onListening(): void {
  let addr = server.address()
  let bind = typeof port === 'string' ? `pipe ${addr}` : `port ${addr.port}`
  debug(`listening on ${bind}`)
}

async function wssConnect(ws) {
  mark.stream = mark.stream || (await liveStream({ ws, mark }))
  ws.on('message', async data => {
    // console.info('Received:')
    // console.info(JSON.stringify(data))
    try {
      data = JSON.parse(data)
      if (!data.type) throw new Error('no type')
      switch (data.type) {
        case 'touch':
          if (mark.touchSocket) {
            let { x, y } = data.data
            switch (mark.orientation) {
              case '270':
                ;[x, y] = [y, 1920 - x]
                break
              case '90':
                ;[x, y] = [1080 - y, x]
                break
              case '180':
                ;[x, y] = [1080 - x, 1920 - y]
                break
            }
            switch (data.data.act) {
              case 'r':
                mark.touchSocket.write(`r\n`)
                console.info(' [minitouch socket write]  ', `r 0\n`)
                break
              case 'd':
                mark.touchSocket.write(`d 0 ${x} ${y} 50\n`)
                mark.touchSocket.write(`c\n`)
                console.info(
                  ' [minitouch socket write]  ',
                  `d 0 ${x} ${y} 50\n`
                )
                break
              case 'm':
                mark.touchSocket.write(`m 0 ${x} ${y} 50\n`)
                mark.touchSocket.write(`c\n`)
                console.info(
                  ' [minitouch socket write]  ',
                  `m 0 ${x} ${y} 50\n`
                )
                break
              case 'u':
                mark.touchSocket.write(`u 0\n`)
                mark.touchSocket.write(`c\n`)
                console.info(' [minitouch socket write]  ', `u 0\n`)
                break
            }
          }
          break
        case 'key':
          sendKey(data.data)
          break
      }
    } catch (e) {
      console.info(e)
    }
  })
  ws.on('close', function() {
    console.info('------ CLOSED ws  ----- :', ws === null, mark.stream === null)
    mark.lastTimeStamp = null
    console.info('Lost a client', ws.readyState)
    ws = null
    console.info('ws cleared', ws !== null && ws.readyState)
    if (mark.stream) mark.stream.end()
  })
}

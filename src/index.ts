import * as http from 'http'
import * as debug from 'debug'

import { Server as WebSocketServer } from 'ws'
import * as net from 'net'

import App from './App'
import { liveStream, getTouchSocket } from './util/frameutil'
import { sideServ } from './sideServ'

debug('ts-express:server')

const port = normalizePort(process.env.PORT || 3001)
App.set('port', port)

const server = http.createServer(App)
var wss = new WebSocketServer({ server: server })

wss.on('connection', wssConnect)

server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

sideServ()

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

let mark = {
  lastTimeStamp: null,
  stream: null,
  touchSocket: null
}
void (async function() {
  mark.touchSocket = await getTouchSocket({ mark })
})()

async function wssConnect(ws) {
  mark.stream = mark.stream || (await liveStream({ ws, mark }))
  ws.on('message', data => {
    console.info('Received:', { data })
    console.info(JSON.stringify(data))
    if (mark.touchSocket) {
      mark.touchSocket.write(data)
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

process.stdin.resume()
process.stdin.on('data', data => {
  console.info('[data input]', JSON.stringify(data.toString()))
  if (mark.touchSocket) {
    mark.touchSocket.write(data.toString())
  }
})

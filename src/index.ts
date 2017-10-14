import * as http from 'http'
import * as debug from 'debug'

import App from './App'

debug('ts-express:server')

const port = normalizePort(process.env.PORT || 3001)
App.set('port', port)

const server = http.createServer(App)
server.listen(port)
server.on('error', onError)
server.on('listening', onListening)

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

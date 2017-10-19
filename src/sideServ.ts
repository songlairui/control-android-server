import {
  getDevices,
  deploy,
  start,
  stop,
  checkRunning,
  forward,
  closeRotatorMonitor,
  getRotatorMonitor
} from './util/adbutil'

let currentStatus = {
  orientation: '0'
}

export async function sideServ() {
  await start(currentStatus) // 启动Serv
  let rotatorMonitorSocket = await getRotatorMonitor()
  let executing = false
  rotatorMonitorSocket.on('readable', async () => {
    if (executing) return
    let chunk = rotatorMonitorSocket.read()
    if (!chunk) return
    currentStatus.orientation = /\d+/.exec(chunk.toString())[0]
    console.info('[Orentation]', JSON.stringify(currentStatus))
    await stop()
    await start(currentStatus)
  })
  rotatorMonitorSocket.on('close', () => {
    setTimeout(sideServ, 3000)
  })
}

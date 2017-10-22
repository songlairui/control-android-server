import {
  getDevices,
  deploy,
  start,
  startTouch,
  stop,
  checkRunning,
  forward,
  closeRotatorMonitor,
  getRotatorMonitor
} from './util/adbutil'

let currentStatus = {
  orientation: '0'
}

export async function sideServ(status) {
  await start(currentStatus) // 启动Serv
  let rotatorMonitorSocket = await getRotatorMonitor()
  let executing = false
  rotatorMonitorSocket.on('readable', async () => {
    if (executing) return
    let chunk = rotatorMonitorSocket.read()
    if (!chunk) return
    currentStatus.orientation = /\d+/.exec(chunk.toString())[0]
    console.info('[  set status.orientation to ', currentStatus.orientation)
    status.orientation = currentStatus.orientation
    // console.info('[Orentation]', JSON.stringify(currentStatus))
    await start(currentStatus)
    await startTouch()
  })
  rotatorMonitorSocket.on('close', () => {
    setTimeout(sideServ, 3000)
  })
}

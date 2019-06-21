import { Options as requestOptions } from 'request'
import Plugin, { tools, AppClient } from '../../plugin'

class BlinkLive extends Plugin {
  constructor() {
    super()
  }
  public name = '直播任务'
  public description = '完成直播任务'
  public version = '0.0.1'
  public author = 'lzghzr'
  /**
   * 任务表
   *
   * @private
   * @type {Map<string, boolean>}
   * @memberof BlinkLive
   */
  private _liveList: Map<string, boolean> = new Map()
  public async load({ defaultOptions, whiteList }: { defaultOptions: options, whiteList: Set<string> }) {
    // 直播任务
    defaultOptions.newUserData['blinkLive'] = false
    defaultOptions.info['blinkLive'] = {
      description: '直播任务',
      tip: '完成直播任务',
      type: 'boolean'
    }
    whiteList.add('blinkLive')
    this.loaded = true
  }
  public async start({ users }: { users: Map<string, User> }) {
    this._blinkLive(users)
  }
  public async loop({ cstMin, cstHour, cstString, users }: { cstMin: number, cstHour: number, cstString: string, users: Map<string, User> }) {
    // 每天00:10刷新任务
    if (cstString === '00:10') this._liveList.clear()
    // 每天04:30, 12:30, 20:30做任务
    if (cstMin === 30 && cstHour % 8 === 4) this._blinkLive(users)
  }
  /**
   * blink签名
   *
   * @private
   * @param {string} params
   * @returns {string}
   * @memberof BlinkLive
   */
  private _signQueryBase(params: string): string {
    let paramsSort = `${params}&actionKey=appkey&appkey=37207f2beaebf8d7&build=3900007\
&device=android&mobi_app=biliLink&platform=android_link&ts=${AppClient.TS}`
    paramsSort = paramsSort.split('&').sort().join('&')
    const paramsSecret = paramsSort + 'e988e794d4d4b6dd43bc0e89d6e90c43'
    const paramsHash = tools.Hash('md5', paramsSecret)
    return `${paramsSort}&sign=${paramsHash}`
  }
  /**
   * 直播任务
   *
   * @private
   * @param {Map<string, User>} users
   * @memberof BlinkLive
   */
  private _blinkLive(users: Map<string, User>) {
    users.forEach(async (user, uid) => {
      if (this._liveList.get(uid) || !user.userData['blinkLive']) return
      const _roomInfo: requestOptions = {
        uri: 'https://api.live.bilibili.com/xlive/app-blink/v1/room/GetInfo?' + this._signQueryBase(`access_key=${user.accessToken}`),
        json: true
      }
      const roomInfo = await tools.XHR<roomInfo>(_roomInfo, 'Android')
      if (roomInfo === undefined || roomInfo.response.statusCode !== 200) return tools.Log(user.nickname, '直播任务', '网络错误')
      if (roomInfo.body.code !== 0) return tools.Log(user.nickname, '直播任务', roomInfo.body)
      const roomID = roomInfo.body.data.room_id
      const _startLive: requestOptions = {
        method: 'POST',
        uri: 'https://api.live.bilibili.com/room/v1/Room/startLive',
        body: this._signQueryBase(`access_key=${user.accessToken}&area_v2=214&live_type=2&room_id=${roomID}&type=1`),
        json: true
      }
      const startLive = await tools.XHR<startLive>(_startLive, 'Android')
      if (startLive === undefined || startLive.response.statusCode !== 200) return tools.Log(user.nickname, '直播任务', '网络错误')
      if (startLive.body.code !== 0) return tools.Log(user.nickname, '直播任务', startLive.body)
      const _stopLive: requestOptions = {
        method: 'POST',
        uri: 'https://api.live.bilibili.com/room/v1/Room/stopLive',
        body: this._signQueryBase(`access_key=${user.accessToken}&room_id=${roomID}`),
        json: true
      }
      tools.XHR<stopLive>(_stopLive, 'Android')
      this._liveList.set(uid, true)
      tools.Log(user.nickname, '直播任务', '直播任务已完成')
    })
  }
}

/**
 * 房间信息
 *
 * @interface roomInfo
 */
interface roomInfo {
  code: number
  message: string
  ttl: number
  data: roomInfoData
}
interface roomInfoData {
  room_id: number
  uid: number
  uname: string
  title: string
  face: string
  try_time: string
  live_status: number
  area_v2_name: string
  area_v2_id: number
  master_level: number
  master_level_color: number
  master_score: number
  master_next_level: number
  max_level: number
  fc_num: number
  rcost: number
  medal_status: number
  medal_name: string
  medal_rename_status: number
  is_medal: number
  full_text: string
  identify_status: number
  lock_status: number
  lock_time: string
  open_medal_level: number
  master_next_level_score: number
  parent_id: number
  parent_name: string
  lock_status_v2: number
}
/**
 * 开始直播
 *
 * @interface startLive
 */
interface startLive {
  code: number
  msg: string
  message: string
  data: startLiveData
}
interface startLiveData {
  change: number
  status: string
  room_type: number
  rtmp: startLiveDataRtmp
  try_time: string
}
interface startLiveDataRtmp {
  addr: string
  code: string
  new_link: string
  provider: string
}
/**
 * 停止直播
 *
 * @export
 * @interface stopLive
 */
interface stopLive {
  code: number
  msg: string
  message: string
  data: stopLiveData
}
interface stopLiveData {
  change: number
  status: string
}

export default new BlinkLive()
"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const plugin_1 = __importStar(require("../../plugin"));
class BlinkLive extends plugin_1.default {
    constructor() {
        super();
        this.name = '直播任务';
        this.description = '完成直播任务';
        this.version = '0.0.1';
        this.author = 'lzghzr';
        this._liveList = new Map();
    }
    async load({ defaultOptions, whiteList }) {
        defaultOptions.newUserData['blinkLive'] = false;
        defaultOptions.info['blinkLive'] = {
            description: '直播任务',
            tip: '完成直播任务',
            type: 'boolean'
        };
        whiteList.add('blinkLive');
        this.loaded = true;
    }
    async start({ users }) {
        this._blinkLive(users);
    }
    async loop({ cstMin, cstHour, cstString, users }) {
        if (cstString === '00:10')
            this._liveList.clear();
        if (cstMin === 30 && cstHour % 8 === 4)
            this._blinkLive(users);
    }
    _signQueryBase(params) {
        let paramsSort = `${params}&actionKey=appkey&appkey=37207f2beaebf8d7&build=3900007\
&device=android&mobi_app=biliLink&platform=android_link&ts=${plugin_1.AppClient.TS}`;
        paramsSort = paramsSort.split('&').sort().join('&');
        const paramsSecret = paramsSort + 'e988e794d4d4b6dd43bc0e89d6e90c43';
        const paramsHash = plugin_1.tools.Hash('md5', paramsSecret);
        return `${paramsSort}&sign=${paramsHash}`;
    }
    _blinkLive(users) {
        users.forEach(async (user, uid) => {
            if (this._liveList.get(uid) || !user.userData['blinkLive'])
                return;
            const _roomInfo = {
                uri: 'https://api.live.bilibili.com/xlive/app-blink/v1/room/GetInfo?' + this._signQueryBase(`access_key=${user.accessToken}`),
                json: true
            };
            const roomInfo = await plugin_1.tools.XHR(_roomInfo, 'Android');
            if (roomInfo === undefined || roomInfo.response.statusCode !== 200)
                return plugin_1.tools.Log(user.nickname, '直播任务', '网络错误');
            if (roomInfo.body.code !== 0)
                return plugin_1.tools.Log(user.nickname, '直播任务', roomInfo.body);
            const roomID = roomInfo.body.data.room_id;
            const _startLive = {
                method: 'POST',
                uri: 'https://api.live.bilibili.com/room/v1/Room/startLive',
                body: this._signQueryBase(`access_key=${user.accessToken}&area_v2=214&live_type=2&room_id=${roomID}&type=1`),
                json: true
            };
            const startLive = await plugin_1.tools.XHR(_startLive, 'Android');
            if (startLive === undefined || startLive.response.statusCode !== 200)
                return plugin_1.tools.Log(user.nickname, '直播任务', '网络错误');
            if (startLive.body.code !== 0)
                return plugin_1.tools.Log(user.nickname, '直播任务', startLive.body);
            const _stopLive = {
                method: 'POST',
                uri: 'https://api.live.bilibili.com/room/v1/Room/stopLive',
                body: this._signQueryBase(`access_key=${user.accessToken}&room_id=${roomID}`),
                json: true
            };
            plugin_1.tools.XHR(_stopLive, 'Android');
            this._liveList.set(uid, true);
            plugin_1.tools.Log(user.nickname, '直播任务', '直播任务已完成');
        });
    }
}
exports.default = new BlinkLive();

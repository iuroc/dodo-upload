"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_js_1 = require("crypto-js");
const fs_1 = require("fs");
const path_1 = require("path");
const form_data_1 = __importDefault(require("form-data"));
const node_fetch_1 = __importDefault(require("node-fetch"));
/**
 * @version 1.0.0
 */
class DodoUpload {
    filePath;
    token;
    uid;
    fileMd5 = '';
    filename;
    extName;
    /**
     * 初始化文件上传程序
     * @param filePath 文件路径
     */
    constructor(filePath, token, uid) {
        this.filePath = filePath;
        this.token = token;
        this.uid = uid;
        this.filename = (0, path_1.basename)(filePath);
        this.extName = (0, path_1.extname)(filePath);
        if (this.extName.length < 2)
            throw new Error('文件后缀名不能为空');
    }
    /**
     * 获取文件 MD5
     * @param filePath 文件路径
     * @returns 文件 MD5
     */
    getFileMd5(filePath) {
        return (0, crypto_js_1.MD5)(crypto_js_1.lib.WordArray.create((0, fs_1.readFileSync)(filePath))).toString(crypto_js_1.enc.Hex);
    }
    /** 获取文件上传接口配置 */
    async getUploadConfig() {
        const { apikey, hmacKey } = this.getKeyInfo();
        const items = [
            ['apikey', apikey],
            ['bucket', 'oss-dodo-upload'],
            ['clientType', '3'],
            ['clientVersion', '0.14.2'],
            ['dir', 'dodo/'],
            ['host', 'https://files.imdodo.com'],
            ['limitSize', '104857600'],
            ['timestamp', Date.now().toString()],
            ['token', this.token],
            ['uid', this.uid]
        ];
        const body = new URLSearchParams([
            ['sig', (0, crypto_js_1.HmacSHA1)(items.map(s => `${s[0]}=${s[1]}`).join('&'), hmacKey).toString(crypto_js_1.enc.Base64)],
            ...items
        ]);
        const res = await (0, node_fetch_1.default)('https://apis.imdodo.com/api/oss/fetchUploadSign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        });
        return (await res.json()).data;
    }
    /** 获取密钥信息，包含 `apikey` 和 HMAC 密钥 */
    getKeyInfo() {
        const data = [
            ['CK18tnKeKDN', 't8yqYCqv68rKOwgPRUBv4Z2hS4kKajHc0yYzrXLf'],
            ['CGrmRus4Xl4', 'BrxswEvSCZK0fTvN5rGyQNqqZAL7vjzZHjDfOXXZ'],
            ['9mEnDRJrkl6', '0ZFDcgZX9iigWbbzmHmqcMFFpZFZcrOu91TsRVCU'],
        ];
        const randomIndex = Math.floor(Math.random() * data.length);
        const [apikey, hmacKey] = data[randomIndex];
        return { apikey, hmacKey };
    }
    /**
     * 启动器，上传文件，返回文件直链 URL
     * @param filePath 文件路径
     * @param token 用户令牌，需要登录网站后通过 `localStorage.getItem('token')` 获取
     * @param uid 用户 ID，需要登录网站后通过 `localStorage.getItem('uid')` 获取
     * @returns 文件直链 URL
     */
    static async run(filePath, token, uid) {
        const dodoUpload = new DodoUpload(filePath, token, uid);
        dodoUpload.fileMd5 = dodoUpload.getFileMd5(filePath);
        const history = await dodoUpload.getHistory();
        if (history.hasRecord)
            return { url: history.resourceUrl, filename: dodoUpload.filename };
        await dodoUpload.upload();
        return { url: await dodoUpload.record(), filename: dodoUpload.filename };
    }
    /** 上传文件到对象存储 */
    async upload() {
        const uploadConfig = await this.getUploadConfig();
        const formData = new form_data_1.default();
        Object.keys(uploadConfig).forEach(key => {
            formData.append(key, uploadConfig[key].toString());
        });
        formData.append('key', `dodo/${this.fileMd5}${this.extName}`);
        formData.append('file', (0, fs_1.createReadStream)(this.filePath), { filename: this.filename });
        await (0, node_fetch_1.default)(uploadConfig.host, {
            method: 'POST',
            body: formData
        });
    }
    /** 提交文件上传记录，使文件直链生效 */
    async record() {
        const { apikey, hmacKey } = this.getKeyInfo();
        const stats = (0, fs_1.statSync)(this.filePath);
        const resourceUrl = `https://files.imdodo.com/dodo/${this.fileMd5}${this.extName}`;
        const items = [
            ['MD5Str', this.fileMd5],
            ['apikey', apikey],
            ['clientType', '3'],
            ['clientVersion', '0.14.2'],
            ['fileName', this.filename],
            ['fileSize', stats.size.toString()],
            ['resourceType', '5'],
            ['resourceUrl', resourceUrl],
            ['timestamp', Date.now().toString()],
            ['token', this.token],
            ['uid', this.uid]
        ];
        const body = new URLSearchParams([
            ['sig', (0, crypto_js_1.HmacSHA1)(items.map(s => `${s[0]}=${s[1]}`).join('&'), hmacKey).toString(crypto_js_1.enc.Base64)],
            ...items
        ]);
        await (0, node_fetch_1.default)('https://apis.imdodo.com/api/oss/file/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Token: this.token },
            body
        });
        return resourceUrl;
    }
    /**
     * 获取文件在服务器中存在的记录
     * @param fileMd5 文件的 MD5
     */
    async getHistory() {
        const { apikey, hmacKey } = this.getKeyInfo();
        const items = [
            ['MD5Str', this.fileMd5],
            ['apikey', apikey],
            ['clientType', '3'],
            ['clientVersion', '0.14.2'],
            ['timestamp', Date.now().toString()],
            ['token', this.token],
            ['uid', this.uid],
        ];
        const body = new URLSearchParams([
            ['sig', (0, crypto_js_1.HmacSHA1)(items.map(s => `${s[0]}=${s[1]}`).join('&'), hmacKey).toString(crypto_js_1.enc.Base64)],
            ...items
        ]);
        const res = await (0, node_fetch_1.default)('https://apis.imdodo.com/api/oss/file/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body
        });
        const data = await res.json();
        if (data.status != 0)
            throw new Error(data.message);
        return data.data;
    }
}
exports.default = DodoUpload;

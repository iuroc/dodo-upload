import { HmacSHA1, enc, MD5, lib } from 'crypto-js'
import { readFileSync, statSync, createReadStream } from 'fs'
import { basename, extname } from 'path'
import FormData from 'form-data'
import nodeFetch from 'node-fetch'

/** 对象存储文件上传接口配置 */
type UploadConfig = {
    OSSAccessKeyId: string
    policy: string
    signature: string
    dir: string
    host: string
    expire: number
}

/**
 * @version 1.0.0
 */
export default class DodoUpload {

    private fileMd5 = ''
    private filename: string
    private extName: string

    /**
     * 初始化文件上传程序
     * @param filePath 文件路径
     */
    private constructor(private filePath: string, private token: string, private uid: string) {
        this.filename = basename(filePath)
        this.extName = extname(filePath)
        if (this.extName.length < 2) throw new Error('文件后缀名不能为空')
    }

    /**
     * 获取文件 MD5
     * @param filePath 文件路径
     * @returns 文件 MD5
     */
    private getFileMd5(filePath: string) {
        return MD5(lib.WordArray.create(readFileSync(filePath))).toString(enc.Hex)
    }

    /** 获取文件上传接口配置 */
    private async getUploadConfig() {
        const { apikey, hmacKey } = this.getKeyInfo()
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
        ]
        const body = new URLSearchParams([
            ['sig', HmacSHA1(items.map(s => `${s[0]}=${s[1]}`).join('&'), hmacKey).toString(enc.Base64)],
            ...items
        ])
        const res = await nodeFetch('https://apis.imdodo.com/api/oss/fetchUploadSign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        })
        return (await res.json()).data as UploadConfig
    }


    /** 获取密钥信息，包含 `apikey` 和 HMAC 密钥 */
    private getKeyInfo() {
        const data = [
            ['CK18tnKeKDN', 't8yqYCqv68rKOwgPRUBv4Z2hS4kKajHc0yYzrXLf'],
            ['CGrmRus4Xl4', 'BrxswEvSCZK0fTvN5rGyQNqqZAL7vjzZHjDfOXXZ'],
            ['9mEnDRJrkl6', '0ZFDcgZX9iigWbbzmHmqcMFFpZFZcrOu91TsRVCU'],
        ]
        const randomIndex = Math.floor(Math.random() * data.length)
        const [apikey, hmacKey] = data[randomIndex]
        return { apikey, hmacKey }
    }

    /**
     * 启动器，上传文件，返回文件直链 URL
     * @param filePath 文件路径
     * @param token 用户令牌，需要登录网站后通过 `localStorage.getItem('token')` 获取
     * @param uid 用户 ID，需要登录网站后通过 `localStorage.getItem('uid')` 获取
     * @returns 文件直链 URL
     */
    public static async run(filePath: string, token: string, uid: string): Promise<{
        url: string
        filename: string
    }> {
        const dodoUpload = new DodoUpload(filePath, token, uid)
        dodoUpload.fileMd5 = dodoUpload.getFileMd5(filePath)
        const history = await dodoUpload.getHistory()
        if (history.hasRecord)
            return { url: history.resourceUrl as string, filename: dodoUpload.filename }
        await dodoUpload.upload()
        return { url: await dodoUpload.record(), filename: dodoUpload.filename }
    }

    /** 上传文件到对象存储 */
    private async upload() {
        const uploadConfig = await this.getUploadConfig()
        const formData = new FormData()
        Object.keys(uploadConfig).forEach(key => {
            formData.append(key, uploadConfig[key as keyof UploadConfig].toString())
        })
        formData.append('key', `dodo/${this.fileMd5}${this.extName}`)
        formData.append('file', createReadStream(this.filePath), { filename: this.filename })
        await nodeFetch(uploadConfig.host, {
            method: 'POST',
            body: formData
        })
    }

    /** 提交文件上传记录，使文件直链生效 */
    private async record() {
        const { apikey, hmacKey } = this.getKeyInfo()
        const stats = statSync(this.filePath)
        const resourceUrl = `https://files.imdodo.com/dodo/${this.fileMd5}${this.extName}`
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
        ]
        const body = new URLSearchParams([
            ['sig', HmacSHA1(items.map(s => `${s[0]}=${s[1]}`).join('&'), hmacKey).toString(enc.Base64)],
            ...items
        ])

        await nodeFetch('https://apis.imdodo.com/api/oss/file/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Token: this.token },
            body
        })
        return resourceUrl
    }


    /**
     * 获取文件在服务器中存在的记录
     * @param fileMd5 文件的 MD5
     */
    private async getHistory() {
        const { apikey, hmacKey } = this.getKeyInfo()
        const items = [
            ['MD5Str', this.fileMd5],
            ['apikey', apikey],
            ['clientType', '3'],
            ['clientVersion', '0.14.2'],
            ['timestamp', Date.now().toString()],
            ['token', this.token],
            ['uid', this.uid],
        ]
        const body = new URLSearchParams([
            ['sig', HmacSHA1(items.map(s => `${s[0]}=${s[1]}`).join('&'), hmacKey).toString(enc.Base64)],
            ...items
        ])
        const res = await nodeFetch('https://apis.imdodo.com/api/oss/file/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body
        })
        const data = await res.json() as {
            data: {
                /** 是否已经在服务器中存在记录 */
                hasRecord: boolean
                /** 文件下载地址 */
                resourceUrl?: string
            }
            message: string
            status: number
        }
        if (data.status != 0) throw new Error(data.message)
        return data.data
    }
}

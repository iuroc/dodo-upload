#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dodoUpload_1 = __importDefault(require("./dodoUpload"));
const promises_1 = require("readline/promises");
const rl = (0, promises_1.createInterface)({
    input: process.stdin,
    output: process.stdout
});
const main = async () => {
    console.log(`>>> DoDo 文件上传获取文件直链工具 <<<
${'-'.repeat(48)}
1. 请登录 DoDo 网页版 https://www.imdodo.com/
2. 通过 localStorage.getItem('token') 获取 token
3. 通过 localStorage.getItem('uid') 获取 uid
4. 根据下方提示输入内容
${'-'.repeat(48)}\n`);
    const token = await rl.question('请输入 token: ');
    if (!token)
        throw new Error('token 不能为空');
    const uid = await rl.question('请输入 uid: ');
    if (!uid)
        throw new Error('uid 不能为空');
    while (true) {
        console.log('\n' + '-'.repeat(48));
        const filePathMatch = await rl.question('请输入文件路径: ').then(i => i.match(/^['"]?(.*?)['"]?$/));
        if (!filePathMatch)
            throw new Error('filePath 不能为空');
        const result = await dodoUpload_1.default.run(filePathMatch[1].trim(), token, uid);
        console.log(`
🎉 文件上传成功
👉 文件名称：${result.filename}
👉 文件直链：${result.url}\n`);
        await rl.question('按回车继续...\n');
    }
};
main();

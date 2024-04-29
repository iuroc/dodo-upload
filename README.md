# dodo-upload

> DoDo 文件上传获取文件直链工具

![image](https://github.com/iuroc/dodo-upload/assets/61752998/b15869de-a0c9-4cb5-ada1-aa5395cbdc28)


## 终端使用

1. 安装 Node.js
2. 全局安装：`npm install -g dodo-upload`
3. 终端（例如 CMD）执行 `dodo-upload` 命令
4. 根据程序提示进行操作

## API 使用

1. 安装依赖：`npm install dodo-upload`
2. 开始使用
    ```ts
    import DodoUpload from 'dodo-upload'

    const token = '你的 token'
    const uid = '你的 uid'
    const filePath = '需要上传的文件路径'
    DodoUpload.run(filePath, token, uid).then(result => {
        const { url, filename } = result
        console.log(`文件名称：${filename}`)
        console.log(`文件直链：${url}`)
    })
    ```

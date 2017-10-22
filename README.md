# Server for Control Android 
> 参考文章 [Developing a RESTful API With Node and TypeScript](http://mherman.org/blog/2016/11/05/developing-a-restful-api-with-node-and-typescript/)
为‘控制安卓’项目布置服务器。


    突然发现，如果自己需要的npm package 没有

    添加 openstf 框架中的adb工具包，参考其代码，做进程启动逻辑

## 运行方法

连接Android，确保adb devices 中有online的device 
默认操作第一个设备 
``` bash
gulp watch &
npm start
```

## Key Skill

- Socket 
  socket的读取与写入

- Stream
  Stream的read() 
  stream on readable 与 on data
  
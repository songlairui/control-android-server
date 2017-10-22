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

## 解决的技术点

- TypeScript  
  体验TypeScript  
  函数参数提示

- express router
  使用 router 创建 restful 风格 api
  // TODO: 使用MVC

- Socket 
  socket的读取与写入

- Stream
  Stream的read() 
  stream on readable 与 on data
  
- async/await 的使用
  对 async 函数取返回值时，漏过一个await，令我得不到socket，无法将touch事件传入。  

- 屏幕旋转，x、y坐标的转置
  屏幕旋转，绘图坐标系旋转，android点击事件的坐标系并不旋转。
  根据绘图坐标系取得的x、y信息，需要进行转置

## TODO  

- 使用 protobuf 对传websocket 
  如果需要  

- 优化 frameutil ，主动丢包。
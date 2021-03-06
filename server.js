var http = require("http");
var fs = require("fs");
var url = require("url");
var port = process.argv[2];

if (!port) {
  console.log("请指定端口号好不啦？\nnode server.js 8888 这样不会吗？");
  process.exit(1);
}

var server = http.createServer(function (request, response) {
  var parsedUrl = url.parse(request.url, true);
  var pathWithQuery = request.url;
  var queryString = "";
  if (pathWithQuery.indexOf("?") >= 0) {
    queryString = pathWithQuery.substring(pathWithQuery.indexOf("?"));
  }
  var path = parsedUrl.pathname;
  var query = parsedUrl.query;
  var method = request.method;

  /******** 从这里开始看，上面不要看 ************/
  const session = JSON.parse(fs.readFileSync("./session.json").toString());

  console.log("有个傻子发请求过来啦！路径（带查询参数）为：" + pathWithQuery);

  if (path === "/sign_in" && method === "POST") {
    //读数据库
    const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
    const array = [];
    request.on("data", (chunk) => {
      array.push(chunk);
    });
    request.on("end", () => {
      const string = Buffer.concat(array).toString();
      const obj = JSON.parse(string); // name password
      const user = userArray.find(
        //在数据库中找匹配的 name 和 password
        (user) => user.name === obj.name && user.password === obj.password
      );
      if (user === undefined) {
        // user 如果是 undefined，那么就是数据库中没有匹配的用户名和密码
        response.statusCode = 400;
        response.setHeader("Content-Type", "text/json; charset=utf-8");
      } else {
        //数据库中有匹配的用户名和密码;
        response.statusCode = 200;
        const random = Math.random();
        const session = JSON.parse(
          //读取 session.json 中的内容
          fs.readFileSync("./session.json").toString()
        );
        session[random] = { user_id: user.id };
        fs.writeFileSync("./session.json", JSON.stringify(session)); //把 session 的内容写到 session.json 中
        response.setHeader("Set-Cookie", `session_id=${random}; HttpOnly`);
      }
      response.end();
    });
  } else if (path === "/home.html") {
    // 写不出来
    const cookie = request.headers["cookie"]; //获取请求头里的Cookie
    let sessionId;
    try {
      //从cookie里提取出登录用户Id，命名为sessionId，其实也就是登录时候设置的 随机数
      sessionId = cookie
        .split(";")
        .filter((s) => s.indexOf("session_id=") >= 0)[0]
        .split("=")[1];
    } catch (error) {}
    if (sessionId && session[sessionId]) {
      //session[sessionId] 就是 session.json 中随机数对应的 user_id 对象
      const userId = session[sessionId].user_id;
      const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
      const user = userArray.find((user) => user.id === userId); //找出数据库中，他的id和登录用户id一样的用户，叫做user
      const homeHtml = fs.readFileSync("./public/home.html").toString(); //获得文件home.html的内容并变成字符串
      let string = "";
      if (user) {
        //如果从cookie里确实有登录用户Id，存在,显示 xx用户已登录
        string = homeHtml
          .replace("{{loginStatus}}", "已登录")
          .replace("{{user.name}}", user.name);
      }
      response.write(string);
    } else {
      const homeHtml = fs.readFileSync("./public/home.html").toString();
      const string = homeHtml
        .replace("{{loginStatus}}", "未登录")
        .replace("{{user.name}}", "");
      response.write(string);
    }
    response.end();
  } else if (path === "/register" && method === "POST") {
    response.setHeader("Content-Type", "text/html; charset=utf-8"); //读数据库
    const userArray = JSON.parse(fs.readFileSync("./db/users.json"));
    const array = []; //声明一个空数组
    //监听请求的上传事件，把chunk数据push到数组里，因为数据可能是一点一点上传，每上传一点，就往数组里push一点数据
    request.on("data", (chunk) => {
      array.push(chunk);
    });
    request.on("end", () => {
      //监听请求的结束事件，先把array里的数据变成字符串，这个字符串符合JSON语法,然后在把字符串变成js对象
      const string = Buffer.concat(array).toString();
      const obj = JSON.parse(string);
      console.log(obj.name); // log 一下，得到就是 name 和 password
      console.log(obj.password);
      const lastUser = userArray[userArray.length - 1];
      const newUser = {
        id: lastUser ? lastUser.id + 1 : 1, //如果数据库中有用户了，那么 id 就是最后一个用户的 id+1，反之就是 id 为 1
        name: obj.name,
        password: obj.password,
      };
      userArray.push(newUser);
      fs.writeFileSync("./db/users.json", JSON.stringify(userArray));
      response.end();
    });
  } else {
    response.statusCode = 200;
    const filePath = path === "/" ? "/index.html" : path; // 默认首页
    const index = filePath.lastIndexOf(".");
    const suffix = filePath.substring(index); // suffix 是后缀
    const fileTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".png": "image/png",
      ".jpg": "image/jpeg",
    };
    response.setHeader(
      "Content-Type",
      `${fileTypes[suffix] || "text/html"};charset=utf-8`
    );
    let content;
    try {
      content = fs.readFileSync(`./public${filePath}`);
    } catch (error) {
      content = "文件不存在";
      response.statusCode = 404;
    }
    response.write(content);
    response.end();
  }

  /******** 代码结束，下面不要看 ************/
});

server.listen(port);
console.log(
  "监听 " +
    port +
    " 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:" +
    port
);

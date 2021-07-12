const fs = require("fs");

//读数据库
const usersString = fs.readFileSync("./db/users.json").toString();
const usersArray = JSON.parse(usersString); //把字符串变成对应的数组对象
console.log(usersArray);

//写数据库
const user3 = { id: 3, name: "kok", password: "bbb" };
usersArray.push(user3);
const string = JSON.stringify(usersArray);
fs.writeFileSync("./db/users.json", string);

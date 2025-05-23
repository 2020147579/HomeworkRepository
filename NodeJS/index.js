const express = require("express");

const fs = require("fs");

const app = express();

app.use(express.static("public"));

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.get("/", (req, res) => {
    res.send("Hello World~!");
});

app.get("/posts", function (req, res) {
    res.json([
        {postId: 1, title: "Hello!"},
        {postId: 2, title: "World!"},

    ]);
});

app.post("/write-file", function (req, res) {
    console.log(req.body);

    if(!req.body?.content){
        res.status(400).send("400에러");
        return;
    }

    fs.writeFile("text.txt", req.body.content, function(error, data){
        if(error){
            res.status(500).send("500");
        } else{
            res.status(201).send("성공");
        }
    })
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log("서버가 실행됐습니다.");
    console.log(`서버주소 : http://localhost:${PORT}`);
})
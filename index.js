const { response } = require("express");
const express = require("express")
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser")
var ObjectId = require("mongodb").ObjectId;
const port = process.env.PORT || 3000;
const mongoDbURL = process.env.MONGODB_URL || "mongodb://localhost:27017/25bl"


var http = require("http").createServer(app);
var io = require("socket.io")(http);



const formidable = require("formidable");
const fs = require("fs");
var session = require("express-session");
app.use(session({
    key: "admin",
    secret: "any random string"
}));

var nodemailer = require("nodemailer");


app.use("/static", express.static(__dirname + "/static"));
app.set("view engine", "ejs");


app.use(bodyParser.urlencoded());
app.use(bodyParser.json());



const MongoClient = require("mongodb").MongoClient;
MongoClient.connect(mongoDbURL, {useNewUrlParser: true}, {useUnifiedTopology: true},function (error, 
client) {
    const blog = client.db("blog");
    console.log("DB connected");

    app.post("/do-delete", function(req, res) {
       //  if (req.session.admin) {
            
             fs.unlink(req.body.image.replace("/", ""), function(error) {

              blog.collection("posts").remove({
                  "_id": ObjectId(req.body._id)
              }, function (error, document) {
                    res.send("Deleted");
              });

             
             });

       //  } else {
            // res.redirect("/admin");
       //  }
    });

    app.get("/admin/settings", function (req, res) {
       res.render("admin/settings")
    });

    app.post("/admin/save_settings", function (req, res) {
         blog.collection("settings").replaceOne({}, {
             "post_limit": req.body.post_limit
         }, { upsert: true }, function (error, document) {
            res.redirect("/admin/settings");
         });
    });

    app.get("/get-posts/:start/:limit", function (req, res) {
        
         blog.collection("posts").find().sort({
             "_id": -1
         }).skip(parseInt(req.params.start)).limit(parseInt(req.params.limit)).toArray(
             function (error, posts) {
             res.send(posts);
         });

    });


app.get("/", function (req, res) {
    

    blog.collection("settings").findOne({}, function (error, 
        settings) {


        var postLimit = parseInt(settings.post_limit);    

        blog.collection("posts").find().sort({ "id": -1 }).limit(
        postLimit).toArray(function (error, posts) {

        res.render("user/home", {
            posts: posts,
            "postLimit": postLimit
        });


        });               
});
});




 app.get("/do-logout", function (req, res) {
    req.session.destroy();
    res.redirect("/admin")
 })
    
    app.get("/admin/dashboard", function (req, res) {
        if (req.session.admin) {
        res.render("admin/dashboard");
        } else {
            res.redirect("/admin")
        }
    });
    
    app.get("/admin/posts", function (req, res) {
        if (req.session.admin) {
           
          blog.collection("posts").find().toArray(function (error, posts
            ) {
              res.render("admin/posts", { "posts": posts })
          });


            } else {
                res.redirect("/admin")
            }
    });

    app.get("/posts/edit/:id", function (req, res) {
        if (req.session.admin) {
             
            blog.collection("posts").findOne({
                 "_id": ObjectId(req.params.id)
             }, function (error, post) {
                res.render("admin/edit_post", { "post": post });
             });
       } else {
            res.redirect("/admin");
      }
    })

    app.post("/do-edit-post", function (req, res) {
        blog.collection("posts").updateOne({
            "_id": ObjectId(req.body._id)
        }, {
            $set: {
                "title": req.body.title,
                "content": req.body.content,
                "image": req.body.image
            }
        }, function (error, post) {
           res.send("Updated Successfully");
        });
    });

    app.post("/do-admin-login", function (req, res) {
      blog.collection("admins").findOne({"email": req.body.email, "password": req.body.password}, function(error, admin) {
          if (admin !="") {
              req.session.admin = admin;
          }
          res.send(admin);
      });
    });

    app.get("/admin", function(req, res) {
      res.render("admin/login")
    });
    
    app.post("/do-post", function (req, res) {
        blog.collection("posts").insertOne(req.body, function (error, document) {
            res.send({
                text: "posted successfully",
                _id: document.insertedId
            });
        });
    });

    
 app.get("/posts/:id", function (req, res) {
    blog.collection("posts").findOne({"_id": ObjectId(req.params.id)}, function (
        error, post) {
     res.render("user/post", {post: post});

    });
 });


 app.post("/do-reply", function(req, res) {
    var reply_id = ObjectId();

    blog.collection("posts").updateOne({
        "_id": ObjectId(req.body.post_id),
        "comments._id": ObjectId(req.body.comment_id)
    }, {
        $push: {
            "comments.$.replies": {
                _id: reply_id,
                name: req.body.name,
                reply: req.body.reply
            }
        }
    }, function (error, document) {

      /* var transporter = nodemailer.createTransport({
           "service": "gmail",
           "auth": {
               "user": "",
               "pass": ""
           }
       });


       var mailOptions = {
           "from": "This Blog",
            "to": req.body.comment_email,
            "subject": "New reply",
            "text":  req.body.name +  "has replied on your comment. http://localhost:3000/posts/" + req.body.post_id
       };
       
       transporter.sendMail(mailOptions, function (error, info) {*/
          
        res.send({
            text: "Replied",
            _id: reply_id
        });
      // });

    });
 });


 app.post("/do-comment", function (req, res) {
     var comment_id = ObjectId();

     blog.collection("posts").updateOne({ "_id": ObjectId(req.body.post_id) }, {
        $push: {
            "comments": {_id: comment_id, username: req.body.username, comment: req.body.comment, email: req.body.email}
        }
     }, function (error, post) {
         res.send({
            text: "comment successfull",
            _id: post.insertedId
            });
     });
 })

 

 app.post('/do-upload-image', function (req, res) {
    const formData = new formidable.IncomingForm();
    formData.parse(req, function (error, fields, files) {
        const oldPath = files.file.path;
        const newPath = "static/images/" + files.file.name;
        
        fs.rename(oldPath, newPath, function (err) {
            res.send("/" + newPath)
        })
    });
 });

 app.post("/do-update-image", function (req, res) {
    const formData = new formidable.IncomingForm();
    formData.parse(req, function (error, fields, files) {

     fs.unlink(fields.image.replace("/", ""), function (error) {
        const oldPath = files.file.path;
        const newPath = "static/images/" + files.file.name;
        
        fs.rename(oldPath, newPath, function (err) {
            res.send("/" + newPath)
        });
     });


        
    });
 });

 io.on("connection", function (socket) {
     console.log("user connected");

     socket.on("new_post", function (formData) {
         socket.broadcast.emit("new_post", formData);
     });

     socket.on("new_comment", function (comment) {
       io.emit("new_comment", comment);
     });

     socket.on("new_reply", function (reply) {
        io.emit("new_reply", reply)
     });

     socket.on("delete_post", function (replyId) {
          socket.broadcast.emit("delete_post", replyId);
     });

 });

 http.listen(port, function (req, res) {
    console.log(`app running on port ${port}...`);
 });





    

});



const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const fse = require('fs-extra');
const httpPort = 5500;
let VERSION;

if (process.env.VER) {
    VERSION = process.env.VER.trim();
    console.log("Serving version: " + VERSION);
} else {
    console.error(
        "App version not set. Set the env var 'VER' to 01, 02, ... before you run the server"
    );
    process.exit();
}

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    console.log(new Date().toLocaleString() + " " + req.url);
    next();
});

app.use(express.static(path.join(__dirname, "public", VERSION)));

app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, "public", VERSION, "index.html"));
});

// potrebno za VER05+
const UPLOAD_PATH = path.join(__dirname, "public", VERSION, "uploads");
var uploadSnaps = multer({
    storage:  multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, UPLOAD_PATH);
        },
        filename: function (req, file, cb) {
            console.log(file.originalname);
            let fn = file.originalname.replace(/:/g, "-");
            cb(null, fn);
        },
    })
}).single("image");
app.post("/saveSnap",  function (req, res) {
    uploadSnaps(req, res, async function(err) {
        if (err) {
            console.log(err);
            res.json({
                success: false,
                error: {
                    message: 'Upload failed:: ' + JSON.stringify(err)
                }
            });
        } else {
            console.log(req.body);
            res.json({ success: true, id: req.body.id });
            if (VERSION==="06") await sendPushNotifications(req.body.title);
        }
    });
});
app.get("/snaps", function (req, res) {
    let files = fse.readdirSync(UPLOAD_PATH);
    files = files.reverse().slice(0, 10);
    console.log("In", UPLOAD_PATH, "there are", files);
    res.json({
        files
    });
});

const webpush = require('web-push');

let subscriptions = [];
const SUBS_FILENAME = 'subscriptions.json';
try {
    subscriptions = JSON.parse(fs.readFileSync(SUBS_FILENAME));
} catch (error) {
    console.error(error);    
}

app.post("/saveSubscription", function(req, res) {
    console.log(req.body);
    let sub = req.body.sub;
    subscriptions.push(sub);
    fs.writeFileSync(SUBS_FILENAME, JSON.stringify(subscriptions));
    res.json({
        success: true
    });
});

async function sendPushNotifications(snapTitle) {
    webpush.setVapidDetails('mailto:lm52738@fer.hr', 
    'BM6HJfJDl8HIoh9AO_JvwUKF-qLDpC9x5vkNWIoVxJFCJpTea2Yr0IDjKasMHF16lxETkRay2lh92lb6iL1VVyU', 
    'U_WqcTMDTTYJq07lTQb1S_w3IdeQ3IKO2mKYTy-thVU');
    subscriptions.forEach(async sub => {
        try {
            console.log("Sending notif to", sub);
            await webpush.sendNotification(sub, JSON.stringify({
                title: 'New snap!',
                body: 'Somebody just snaped a new photo: ' + snapTitle,
                redirectUrl: '/index.html'
              }));    
        } catch (error) {
            console.error(error);
        }
    });
}

app.listen(httpPort, function () {
    console.log(`HTTP listening on port: ${httpPort}`);
});


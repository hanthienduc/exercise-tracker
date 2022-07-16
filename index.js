// https://github.com/hanthienduc/exercise-tracker

const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const endOfDay = require("date-fns/endOfDay");
const startOfDay = require("date-fns/startOfDay");

app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Database connected");
  })
  .catch((err) => {
    console.log(err);
  });

app.use(bodyParser.urlencoded({ extended: false }));
// app.use(bodyParser.json())

const Users = mongoose.model("Users", {
  username: { type: String },
});

const Exercises = mongoose.model("Exercises", {
  username: String,
  description: String,
  duration: Number,
  date: Date,
  userId: String,
});

app.get("/api/users", function (req, res, next) {
  Users.find(function (err, result) {
    if (err) res.json(err);
    res.json(result);
  });
});

app.post("/api/users", function (req, res, next) {
  const username = req.body.username;
  const user = new Users({ username: username });
  user.save(function (err, result) {
    if (err) res.json({ error: err });
    res.json(result);
  });
});

app.post("/api/users/:_id/exercises", function (req, res, next) {
  const userId = req.params._id;
  const description = req.body.description;
  const duration = req.body.duration;
  let date = req.body.date;
  if (!date) {
    date = new Date();
  }
  Users.findOne({ _id: userId }, function (err, result) {
    if (err) res.json({ error: "couldn't find user to add exercise data" });
    if (!result)
      return res.json({ error: "couldn't find user to add exercise data" });
    const exercise = new Exercises({
      username: result.username,
      description: description,
      duration: duration,
      date: new Date(date),
      userId: result._id,
    });
    exercise.save(function (err, data) {
      if (err) res.json({ error: err });
      res.json({
        username: data.username,
        description: data.description,
        duration: data.duration,
        date: data.date.toDateString(),
        _id: data.userId,
      });
    });
  });
});

app.get("/api/users/:_id/logs?", function (req, res) {
  const userId = req.params._id;

  Users.findOne({ _id: userId }, function (err, result) {
    if (err) return res.json({ error: err });
    if (!result) return res.json({ error: "user not found" });

    const reqQuery = req.query;
    const fromDate = new Date(reqQuery.from);
    const toDate = new Date(reqQuery.to);
    const limit = parseInt(reqQuery.limit);
    if (!reqQuery || !fromDate || !toDate) {
      res.json({
        _id: result._id,
        username: result.username,
        count: 0,
        log: [],
      });
    }
    Exercises.find({
      userId: result._id,
      date: {
        $gte: startOfDay(fromDate),
        $lte: endOfDay(toDate),
      },
    })
      .limit(limit)
      .exec(function (err, data) {
        if (!result || err) {
          res.json({
            _id: result._id,
            username: result.username,
            count: 0,
            log: [],
          });
        }
        res.json({
          _id: result._id,
          username: result.username,
          from: new Date(fromDate).toDateString(),
          to: new Date(toDate).toDateString(),
          count: data.length,
          log: data.map((item) => {
            return {
              description: item.description,
              duration: item.duration,
              date: item.date.toDateString(),
            };
          }),
        });
      });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

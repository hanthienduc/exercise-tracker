// https://github.com/hanthienduc/exercise-tracker

const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

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
  date: String,
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
  const date = req.body.date;

  Users.findOne({ _id: userId }, function (err, result) {
    if (err) res.json({ error: "couldn't find user to add exercise data" });
    if (!result)
      return res.json({ error: "couldn't find user to add exercise data" });
    const exercise = new Exercises({
      username: result.username,
      description: description,
      duration: duration,
      date: new Date(date).toDateString(),
      userId: result._id,
    });
    exercise.save(function (err, data) {
      if (err) res.json({ error: err });
      res.json({
        username: data.username,
        description: data.description,
        duration: data.duration,
        date: data.date,
        _id: data.userId,
      });
    });
  });
});

app.get("/api/users/:_id/logs?", function (req, res) {
  const userId = req.params._id;
  const reqQuery = req.query;
  const fromDate = reqQuery.from;
  const toDate = reqQuery.to;
  const limit = parseInt(reqQuery.limit);

  Users.findOne({ _id: userId }, function (err, result) {
    if (err) return res.json({ error: err });
    if (!result) return res.json({ error: "user not found" });
    Exercises.find({
      userId: result._id,
      date: {
        $gte: new Date(fromDate).toDateString(),
        $lte: new Date(toDate).toDateString(),
      },
    })
      .limit(limit)
      .exec(function (err, data) {
        if (err) return res.json({ error: "couldn't find any data" });
        if (!result) return res.json({ error: "couldn't find any data" });
        res.json({
          username: result.username,
          count: data.length,
          _id: result._id,
          log: data.map((item) => {
            return {
              description: item.description,
              duration: item.duration,
              date: item.date,
            };
          }),
        });
      });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

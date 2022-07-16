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
app.use(bodyParser.json());

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [
    {
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: { type: Date, required: true },
    },
  ],
});

const Users = mongoose.model("Users", userSchema);

app.get("/api/users", function (req, res, next) {
  Users.find({}, function (err, users) {
    if (err) res.json(err);
    const returnData = users.map((user) => {
      return {
        _id: user._id,
        username: user.username,
      };
    });
    res.json(returnData);
  });
});

app.post("/api/users", function (req, res, next) {
  const username = req.body.username;
  const user = new Users({ username: username });
  user.save(function (err, result) {
    if (err) res.json({ error: err });
    const returnObj = {
      _id: result._id,
      username: result.username,
    };
    res.json(returnObj);
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
  date = new Date(date);

  const exerciseData = {
    description: description,
    duration: duration,
    date: date,
  };

  Users.findByIdAndUpdate(
    { _id: userId },
    { new: true },
    function (err, userFound) {
      if (err) res.json({ error: "couldn't find user to add exercise data" });
      if (!userFound)
        return res.json({ error: "couldn't find user to add exercise data" });

      userFound.log.push(exerciseData);
      userFound.save(function (err, result) {
        if (err) res.json({ error: err });
        const returnExerciseObj = {
          _id: result._id,
          username: result.username,
          date: exerciseData.date.toDateString(),
          duration: parseInt(exerciseData.duration),
          description: exerciseData.description,
        };
        res.json(returnExerciseObj);
      });
    }
  );
});

app.get("/api/users/:_id/logs?", function (req, res) {
  const userId = req.params._id;
  const reqQuery = req.query;
  const fromDate = reqQuery.from;
  const toDate = reqQuery.to;
  const limit = parseInt(reqQuery.limit);

  const queryData = {
    _id: userId,
  };

  if (fromDate && toDate) {
    queryData.date = {
      $gte: startOfDay(new Date(fromDate)),
      $lte: endOfDay(new Date(toDate)),
    };
  }

  Users.findById(queryData).exec(function (err, userLog) {
    if (err) return res.json(err);
    const response = {
      _id: userLog._id,
      username: userLog.username,
    };
    if (fromDate) {
      response.from = new Date(fromDate).toDateString();
    }
    if (toDate) {
      response.to = new Date(toDate).toDateString();
    }
    response.count = userLog.log.length;
    const filteredItem = userLog.log.filter(
      (item, index) => limit ? index < limit : index > 0
    );
    response.log = filteredItem;
    res.json(response);
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

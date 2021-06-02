const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
require('dotenv').config()
const { User, Exercise } = require('./models');

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({extended: false}));

mongoose.connect(process.env.DB_URI,
{
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html')
  });

  app.post('/api/users', (req, res) => {
    User.create({
      username: req.body.username
      }).then( user => {
        return res.json({
          username: user.username,
          _id: user._id
          });
      }).catch( err => {
        console.error(err);
        res.send(500);
      });
  })

  app.post('/api/users/:_id/exercises', (req, res) => {
    Exercise.create({
      description: req.body.description,
      duration: Number.parseInt(req.body.duration, 10),
      date: req.body.date ? new Date(req.body.date) : new Date()
    }).then( exercise => {
      User.findByIdAndUpdate(
        req.params._id,
        {
          $push: { exercises: exercise._id }
        },
        {
          new: true,
          useFindAndModify: false
        }
      ).then( user => {
        return res.json({
          _id: user._id,
          username: user.username,
          description: exercise.description,
          date: exercise.date.toDateString(),
          duration: exercise.duration
        });
      }).catch( err => {
        console.error(err);
      return res.send(500);
    });
    }).catch( err => {
      console.error(err);
      return res.send(500);
    });
  });

  app.get('/api/users/:_id/logs', (req, res) => {
    let query = User.findById(req.params._id);
    let opts = {
      path: 'exercises',
      match: {},
      select: 'description duration date -_id'
    };

    if(req.query.from) {
      opts.match.date = {$gte: new Date(req.query.from)};
    }

    if(req.query.to) {
      if(opts.match.date) {
        opts.match.date = Object.assign(opts.match.date, {$lte: new Date(req.query.to)});
      } else {
        opts.match.date= {$lte: new Date(req.query.to)};
      }
    }

    if(req.query.limit) {
      opts.options = { limit: Number.parseInt(req.query.limit, 10) };
    }
    query.populate(opts);
    query.exec((err, result) => {
      if(err) {
        console.log(err);
        return res.send(500);
      }

      let response = {
        _id: result._id,
        username: result.username,
        count: result.exercises.length,
        log: result.exercises.map(ex => {
          return {
            description: ex.description,
            duration: ex.duration,
            date: new Date(ex.date).toDateString()
          }
        })
      }
      if(req.query.from) {
        response.from = new Date(req.query.from).toDateString();
      }

      if(req.query.to) {
        response.to = new Date(req.query.to).toDateString();
      }
      return res.json(response)
    })
  })

  app.get('/api/users', (req, res) => {
    User.find({}).then(users => {
      const result = users.map(user => {
        return {
          _id: user._id,
          username: user.username
        }
      });
      return res.send(result);
    }).catch(err => {
      console.error(err);
      res.send(500)
    })
  })

  const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
  
})
})
.catch(err => {
  console.error('Connection error:', err);
})







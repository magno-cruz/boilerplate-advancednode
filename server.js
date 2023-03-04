'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');
const routes = require('./routes.js');
const auth = require('./auth.js');

const passportSocketIo = require('passport.socketio')
const cookieParser = require('cookie-parser')
const MongoStore = require('connect-mongo') (session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.set('view engine', 'pug');
app.set('views', './views/pug');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  key: 'express.sid',
  store: store
}));

app.use(passport.initialize());
app.use(passport.session());

fccTesting(app); // For fCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

io.use(
	passportSocketIo.authorize({
	  cookieParser: cookieParser,
	  key: 'express.sid',
	  secret: process.env.SESSION_SECRET,
	  store: store,
	  success: onAuthorizeSuccess,
	  fail: onAuthorizeFail
	})
  );

myDB(async client => {
  const myDataBase = await client.db('database').collection('users');
  
 
  //routes.js
  app.route('/').get((req, res) => {
    res.render('index', {
      title: 'Connected to Database',
      message: 'Please log in',
      showLogin: true,
      showRegistration: true,
	  showSocialAuth: true
    });
  });
  app.route('/auth/github')
  .post(passport.authenticate('github', (req,res) => {
  }));
  app.route('/auth/github/callback')
  .post(passport.authenticate('github', { failureRedirect: '/' }), (req,res) => {
    req.session.user_id = req.user.id
	res.redirect('/chat');
  });

  app.route('/chat')
  .post(passport.ensureAuthenticated('chat.pug', { user: req.user }), (req,res) => {
    res.redirect('/profile');
  });

  app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/profile');
  });

  app.route('/profile').get(ensureAuthenticated, (req,res) => {
    res.render('profile', { username: req.user.username });
  });

  app.route('/logout').get((req, res) => {
    req.logout();
    res.redirect('/');
  });

  app.route('/register').post((req, res, next) => {
    const hash = bcrypt.hashSync(req.body.password, 12);
    myDataBase.findOne({ username: req.body.username }, (err, user) => {
      if (err) {
        next(err);
      } else if (user) {
        res.redirect('/');
      } else {
        myDataBase.insertOne({
          username: req.body.username,
          password: hash
        },
          (err, doc) => {
            if (err) {
              res.redirect('/');
            } else {
              // The inserted document is held within
              // the ops property of the doc
              next(null, doc.ops[0]);
            }
          }
        )
      }
    })
  },
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res, next) => {
      res.redirect('/profile');
    }
  );

  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not Found');
  });
  //routes.js
  
  routes(app, myDataBase);
  auth(app, myDataBase);

  let currentUsers = 0;
  io.on('connection', (socket) => {
	++currentUsers;
	io.emit('user', {
	  username: socket.request.user.username,
	  currentUsers,
	  connected: true
	});
	socket.on('chat message', (message) => {
		io.emit('chat message', { username: socket.request.user.username, message });
  });


  console.log('A user has connected');
    
//auth.js

//require('dotenv').config();

const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const { ObjectID } = require('mongodb');
const GitHubStrategy = require('passport-github').Strategy

module.exports = function (app, myDataBase) {
  passport.serializeUser((user, done) => {
      done(null, user._id);
  });
  passport.deserializeUser((id, done) => {
      myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
          //if (err) return console.error(err);
          //done(null, doc);
		  done(null, null);
      });
  });
  passport.use(new LocalStrategy((username, password, done) => {
    myDataBase.findOne({ username: username }, (err, user) => {
      console.log(`User ${username} attempted to log in.`);
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      if (!bcrypt.compareSync(password, user.password)) { 
          return done(null, false);
      }
      return done(null, user);
    });
  }));


  passport.use(new GitHubStrategy({
	clientID: process.env.GITHUB_CLIENT_ID,
	clientSecret: process.env.GITHUB_CLIENT_SECRET,
	callbackURL: 'https://boilerplate-advancednode.magnocruz.repl.co/auth/github/callback'
  },
	function(accessToken, refreshToken, profile, cb) {
	  console.log(profile);
	  myDataBase.findOneAndUpdate(
		{ id: profile.id },
		{
		  $setOnInsert: {
			id: profile.id,
			username: profile.username,
			name: profile.displayName || 'John Doe',
			photo: profile.photos[0].value || '',
			email: Array.isArray(profile.emails)
			  ? profile.emails[0].value
			  : 'No public email',
			created_on: new Date(),
			provider: profile.provider || ''
		  },
		  $set: {
			last_login: new Date()
		  },
		  $inc: {
			login_count: 1
		  }
		},
		{ upsert: true, new: true },
		(err, doc) => {
		  return cb(null, doc.value);
		}
	  );	}
  ));
}

//auth.js



  	console.log('A user has disconnected');
	socket.on('disconnect', () => {
		console.log('A user has disconnected');
		--currentUsers;
		io.emit('user', {
			username: socket.request.user.username,
			currentUsers,
			connected: false
	  });
	});
});

	socket.on('user', data => {
		$('#num-users').text(data.currentUsers + ' users online');
		let message = data.username + (data.connected ? ' has joined the chat.' : ' has left the chat.');
		$('#messages').append($('<li>').html('<b>' + message + '</b>'));
	});
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: 'Hello', message: 'Please log in' });
  });
});

function onAuthorizeSuccess(data, accept) {
	console.log('successful connection to socket.io');
  
	accept(null, true);
  }
  
  function onAuthorizeFail(data, message, error, accept) {
	if (error) throw new Error(message);
	console.log('failed connection to socket.io:', message);
	accept(null, false);
  }

//console.log('user ' + socket.request.user.username + ' connected');

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});
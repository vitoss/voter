var url = require('url');
var querystring = require('querystring');
var http = require('http');
var https = require('https');
var express = require('express');
var connect = require('connect');

var settings = require('config/server.js');

//database - CouchDB

var nano = require('nano')(settings.database.url);
var db = nano.use(settings.database.name);

var RedisStore = require('connect-redis')(connect);
var sessionStore = new RedisStore();

// package for flash messages
var flash = require('connect-flash');

var app = express.createServer();

//app.use(express.logger()); //logs all resources and hits to server
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser("{please provide your own cookie random string}"));
app.use(express.session({
  store: sessionStore,
  secret: "{please provide your own secret string}",
  key: 'express.sid'
}));
app.use(flash());
// app.use(app.router); //what for?
//CONFIGURATION 
// NODE_ENV=production node app.js
// app.configure(function(){
//     app.use(express.methodOverride());
//     app.use(express.bodyParser());
//     app.use(app.router);
// });
// app.configure('development', function(){
//     app.use(express.static(__dirname + '/public'));
//     app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
// });
// app.configure('production', function(){
//   var oneYear = 31557600000;
//   app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
//   app.use(express.errorHandler());
// });
//CONFIGURATION ENDS
app.set('views', __dirname + '/views');
//set path to static files
app.use(express.static(__dirname + '/../public'));

// Authorization Middleware
/*
  0 - unregistered
  10 - user
  20 - owner
  30 - admin
*/
var requireSecurityLevel = function(level) {
    return function(req, res, next) {
      //console.log("'requireSecurityLevel' sid: " + req.session.id);
      if ('user' in req.session && req.session.user.level >= level) next();
      else res.send(403);
    }
  };

/* helpers */
var prepareFlashMessages = function(req) {
    //console.log("'/' sid: " + req.session.id);
    var flashes = req.flash('success');
    var messages = [];
    for (var i = 0, l = flashes.length; i < l; i++) {
      messages.push({
        type: 'success',
        text: flashes[i]
      });
    }

    return messages;
  };

var prepareUserInfo = function(req) {
    var userSession = req.session.user;
    var userInfo = null;
    if (userSession != null) {
      userInfo = {};
      userInfo.email = userSession.verifiedEmail;
      userInfo.photoUrl = userSession.photoUrl;
      userInfo.displayName = userSession.displayName;
    }

    return userInfo;
  }; /* end of helpers */
//handle GET requests on /
app.get('/', function(req, res) {
  var userInfo = prepareUserInfo(req);
  var messages = prepareFlashMessages(req);

  res.render('index.jade', {
    title: 'Voter',
    headerTitle: 'Ideas',
    user: userInfo,
    messages: messages
  });
});

app.get('/keyword/:keyword', function(req, res) {
  console.log("Show page with keyword.");
  var keyword = req.params.keyword;

  var userInfo = prepareUserInfo(req);
  var messages = prepareFlashMessages(req);

  res.render('index.jade', {
    title: 'Voter',
    headerTitle: 'Ideas for ' + keyword,
    user: userInfo,
    messages: messages,
    keyword: keyword
  });
});

//Google Identity Toolkit assertion verification
app.get('/verify', function(req, res) {
  // Verify identity assertion
  // send request to GIT
  var post_data = JSON.stringify({
    returnOauthToken: true,
    requestUri: 'http://' + req.headers.host + req.url,
    postBody: req.body
  });

  var post_options = {
    host: 'www.googleapis.com',
    port: '443',
    path: '/identitytoolkit/v1/relyingparty/verifyAssertion?key={please provide your own key}',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(post_data, 'utf8')
    }
  };

  // function checking user level - static for now 
  var getUserLevel = function(userData) {
      if (userData.verifiedEmail == settings.administrator_email) {
        return 30;
      } else {
        return 10;
      }
    };

  // Set up the request
  var post_req = https.request(post_options, function(queryResponse) {
    console.log('STATUS: ' + queryResponse.statusCode);
    console.log('HEADERS: ' + JSON.stringify(queryResponse.headers));
    queryResponse.setEncoding('utf8');
    var receivedData = "";
    queryResponse.on('data', function(chunk) {
      console.log('Response: ' + chunk);
      receivedData += chunk;
    });

    queryResponse.on('end', function() {
      receivedData = JSON.parse(receivedData);

      //set proper cookies
      req.session.user = receivedData;

      req.session.user.level = getUserLevel(receivedData);

      var userData = {
        email: receivedData.verifiedEmail,
        // required
        displayName: receivedData.displayName,
        // optional
        photoUrl: receivedData.photoUrl,
        // optional
      };

      req.flash('success', "You have been logged in.");

      res.render('verification_success.jade', {
        title: "Verification success",
        "user": userData
      });
    });
  });

  post_req.on('error', function(e) {
    console.log('problem with request: ' + e.message);
    res.end();
  });

  // post the data
  post_req.write(post_data);
  post_req.end();
});

app.get('/logout', function(req, res) {
  //destroy old session and create new one
  req.session.regenerate(function(err) {
    if (err) {
      console.log('Error destroying session...');
      res.end();
    } else {
      req.flash('success', 'You have been logged out successfully!');
      console.log('User has been logged out successfully.');
      res.redirect('/');
    }
  });
});

//Get all ideas
app.get('/ideas/:page?', requireSecurityLevel(10), function(req, res) {

  var page = req.params.page;
  if (!page) {
    page = 0;
  }

  console.log("Get all ideas with results.");
  db.view('ideas', 'ideas', {
    group: true
  }, function(err, body) {
    if (!err) {
      //parse response
      var ideas = [];
      body.rows.forEach(function(doc) {
        //ommit archived ones (TODO maybe write better map/reduce)
        if (doc.value == null) {
          return;
        }

        var ownership = (doc.value.Author.Email == req.session.user.verifiedEmail || req.session.user.level == 30) ? true : false;

        var idea = {
          Key: doc.value._id,
          Title: doc.value.Title,
          Description: doc.value.Description,
          Author: doc.value.Author,
          Value: doc.value.Value,
          Owner: ownership,
          Keywords: doc.value.Keywords
        };
        ideas.push(idea);
      });

      //sorting elements
      ideas.sort(function(a, b) {
        return b.Value - a.Value;
      });

      res.write(JSON.stringify(ideas.slice(page * 10, 10)));
    } else {
      res.write("An error occured: " + err);
    }
    res.end();
  });
});

app.get('/ideas/keyword/:keyword', requireSecurityLevel(10), function(req, res) {

  //keyword is case insensitive
  var keyword = req.params.keyword.toLowerCase();

  console.log("Get all ideas with results by keyword: " + keyword);
  db.view('ideas', 'ideasByKeyword', {
    key: keyword
  }, function(err, body) {
    if (!err) {

      if (body.rows.length == 0) {
        res.write(JSON.stringify({}));
        res.end();
        return;
      }

      var ideasKeys = body.rows[0].value;

      db.view('ideas', 'ideas', {
        keys: ideasKeys,
        group: true
      }, function(err, body) {
        if (!err) {
          //parse response
          var ideas = [];
          body.rows.forEach(function(doc) {
            //ommit archived ones (TODO maybe write better map/reduce)
            if (doc.value == null) {
              return;
            }

            var ownership = (doc.value.Author.Email == req.session.user.verifiedEmail || req.session.user.level == 30) ? true : false;

            var idea = {
              Key: doc.value._id,
              Title: doc.value.Title,
              Description: doc.value.Description,
              Author: doc.value.Author,
              Value: doc.value.Value,
              Owner: ownership,
              Keywords: doc.value.Keywords
            };
            ideas.push(idea);
          });

          //sorting elements
          ideas.sort(function(a, b) {
            return b.Value - a.Value;
          });

          res.write(JSON.stringify(ideas));
        } else {
          res.write("An error occured: " + err);
        }
        res.end();
      });
    } else {
      res.write("An error occured: " + err);
      res.end();
    }
  });
});

app.post('/ideas', requireSecurityLevel(10), function(req, res) {

  console.log('Posting new idea.');
  var idea = req.body;
  idea.Author = {
    Email: req.session.user.verifiedEmail,
    DisplayName: req.session.user.displayName
  };
  idea.type = "idea";

  if (typeof(idea.Title) == "undefined" || idea.Title == null || idea.Title == "") {
    res.write("Error: not title provided");
    res.end();
    return;
  }

  //post idea to db
  db.insert(idea, function(err, body) {
    if (!err) {
      //get additional information from database...
      idea.Key = body.id;
      idea.Value = 0; //default value is 0
      io.sockets.emit("IdeaAdded", idea);
      res.write(JSON.stringify(idea));
    } else {
      res.write("Error occured:" + err);
    }
    res.end();
  });
});

app.get('/ideas/:id/votes', requireSecurityLevel(20), function(req, res) {

  console.log("Get votes list for concret idea.");
  var idea_id = req.params.id;

  db.view('ideas', 'votesByIdea', {
    key: idea_id,
    group: true
  }, function(err, body) {
    if (!err) {
      //parse response
      var votes = [];
      if (body.rows.length == 1) {
        votes = body.rows[0].value.Votes;
      }

      res.write(JSON.stringify(votes));
    } else {
      res.write("An error occured: " + err);
    }
    res.end();
  });
});

app.delete('/ideas/:id', requireSecurityLevel(10), function(req, res) {
  var idea_id = req.params.id;
  console.log("Archiving idea: " + idea_id);

  //first get idea
  db.view('ideas', 'ideas', {
    group: true,
    key: idea_id
  }, function(err, body) {
    if (!err) {
      //does we find idea?
      if (body.rows.length != 1) {
        //write 404
        res.writeHead(404, {
          "Content-Type": "application/json"
        });
        res.write(JSON.stringify({
          msg: "404 Not Found"
        }));
        res.end();
        return;
      }

      var idea = body.rows[0].value;
      //if idea found and check if user is owener
      if (idea.Author.Email != req.session.user.verifiedEmail && req.session.user.level == 10) {
        //write 403
        res.writeHead(403, {
          "Content-Type": "application/json"
        });
        res.write(JSON.stringify({
          msg: "403 Not Authorized"
        }));
        res.end();
        return;
      }

      idea.Archived = true;

      //set Archive flag to 1 and update
      db.insert(idea, function(err, body) {
        if (!err) {
          //if everything went smoothly - return Deleted = true
          res.write(JSON.stringify({
            Deleted: true
          }));
          io.sockets.emit("IdeaDeleted", {
            "idea": idea._id
          });
        } else {
          res.write("Error occured:" + err);
        }
        res.end();
      });

    } else {
      res.write("An error occured: " + err);
    }
    res.end();
  });
});

app.post('/ideas/:id/votes', requireSecurityLevel(10), function(req, res) {

  console.log("Post new vote to concret idea.");
  var idea_id = req.params.id;
  var vote = req.body;
  vote.Idea = idea_id;
  vote.Author = {
    Email: req.session.user.verifiedEmail,
    DisplayName: req.session.user.displayName
  };
  vote.type = 'vote';

  var key = idea_id + "_" + vote.Author.Email;
  db.view("ideas", "vote_author", {
    key: key
  }, function(err, body) {
    if (!err) {
      //parse response
      if (body.rows.length > 0) {
        //get first and update it
        var retrivedVote = body.rows[0];
        vote._id = retrivedVote.value._id;
        vote._rev = retrivedVote.value._rev;
        var oldValue = retrivedVote.value.Value;

        var socketMessage = {
          idea: vote.Idea
        };

        res.writeHead(200, {
          'Content-Type': "application/json"
        });
        db.insert(vote, function(err, body) {
          if (!err) {
            res.write(JSON.stringify({
              Patched: true
            }));
            socketMessage.difference = vote.Value - oldValue;
            io.sockets.emit("IdeaValueChanged", socketMessage);
          } else {
            res.write("Error occured:" + err);
          }
          res.end();
        });
      } else {
        //create new vote
        db.insert(vote, function(err, body) {
          if (!err) {
            var socketMessage = {
              idea: idea_id
            };
            //if everything went smoothly - return Patched = true
            res.write(JSON.stringify({
              Patched: true
            }));
            socketMessage.difference = vote.Value;
            io.sockets.emit("IdeaValueChanged", socketMessage);
          } else {
            res.write("Error occured:" + err);
          }
          res.end();
        });
      }

    } else {
      res.write("An error occured: " + err);
      res.end();
    }
  });
});

/* Not mission critical pages */
app.get('/mockup', function(req, res) {
  res.render('mockup.jade', {
    title: 'Voter'
  });
});

app.get('/changelog', function(req, res) {
  res.render('changelog.jade', {
    title: 'Voter changelog',
    headerTitle: 'Changelog'
  });
});

app.get('/todo', function(req, res) {
  res.render('requests.jade', {
    title: 'Voter Todo',
    headerTitle: 'Todo & Requests'
  });
});
/* End of mission critical pages */

/*Sockets*/
var server = app.listen(settings.web_port);

var io = require('socket.io').listen(server);

/* Sockets IO */
io.sockets.on('connection', function(socket) {
  console.log('A socket with sessionID ' + socket.handshake.sessionID + ' connected!');

  socket.on('RequestVotesForUserByIdeas', function(data) {
    console.log("Get votes for current user and idea")

    var userEmail = socket.handshake.session.user.verifiedEmail;
    //get votes for all ideas, it can be -1,+1 or null (not voted)
    //prepare view key list
    //key = ideaId_authorEmail
    var keys = [];
    for (var i = 0, l = data.Ideas.length; i < l; i++) {
      keys.push(data.Ideas[i] + "_" + userEmail);
    }

    db.view("ideas", "vote_author", {
      'keys': keys
    }, function(err, body) {
      if (!err) {
        //parse and simplify data
        var voteStatuses = [];
        for (var i = 0, l = body.rows.length; i < l; i++) {
          var row = body.rows[i];
          var ideaId = row.key.split('_')[0]; //row.id is mapped object id! not idea id!
          var voteStatus = {
            idea: ideaId,
            value: row.value.Value
          };
          voteStatuses.push(voteStatus);
        }

        socket.emit("VotesForUserByIdeas", voteStatuses);
      }
    })
  });
});

var parseCookie = require('connect').utils.parseCookie;

io.set('authorization', function(data, accept) {
  if (data.headers.cookie) {
    data.cookie = parseCookie(data.headers.cookie);
    data.sessionID = data.cookie['express.sid'];
    //fix for parse cookie session bug
    data.sessionID = data.sessionID.split('.')[0];
    // (literally) get the session data from the session store
    sessionStore.get(data.sessionID, function(err, session) {
      if (err || !session) {
        // if we cannot grab a session, turn down the connection
        accept('Error', false);
      } else {
        // save the session data and accept the connection
        data.session = session;
        accept(null, true);
      }
    });
  } else {
    return accept('No cookie transmitted.', false);
  }
});
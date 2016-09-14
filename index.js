'use strict'

var https = require('https');
var http = require('http');
var cookie_parser = require('cookie');
var url = require('url');
var querystring = require('querystring');
var NodeCache = require( "node-cache" );
var xlaCache = new NodeCache();
var xla = exports = module.exports = {};

function convertToTimestamp(datetime) {
    var date;

    date = new Date(datetime);

    return Math.floor(date.getTime()/1000);
}

xla.FetchPreAuthData = function(callback) {
  var url_post = null;
  var ppft_re = null;
  xlaCache.get('url_post', function(err, value) {
    if (!err && value) {
        url_post = value;
    }
  });
  xlaCache.get('ppft_re', function(err, value) {
    if (!err && value) {
      ppft_re = value;
    }
  });
  
  if (!url_post || !ppft_re) {
    var post_vals = {
      client_id: '0000000048093EE3',
      redirect_uri: 'https://login.live.com/oauth20_desktop.srf',
      response_type: 'token',
      display: 'touch',
      scope: 'service::user.auth.xboxlive.com::MBI_SSL',
      locale: 'en',
    }
    var post_vals_qs = unescape(querystring.stringify(post_vals));

    var options = {
      host: 'login.live.com',
      method: 'GET',
      path: '/oauth20_authorize.srf?' + post_vals_qs,
    }
    
    var xruReq = https.request(options, function(res) {
      var cookie = res.headers['set-cookie'];
      var cookies = '';
      var a_cookie;
      for(var i = 0; i < cookie.length; i++) {
        a_cookie = cookie_parser.parse(cookie[i]);
        var keys = Object.keys(a_cookie);
        var desired_key = keys[0];
        var desired_value = a_cookie[desired_key]; 
        cookies += desired_key + "=" + desired_value;
        
        if (i < cookie.length - 1)
          cookies += "; ";
      }
         
      xlaCache.set('cookie', cookies, 0, function(err, success) {
        if (err) {
          console.log("Failed to save the cookie");
        }
      });
      var str = ''
      res.on('data', function (chunk) {
        str += chunk;
      });
      res.on('end', function () {
        url_post = str.match(/urlPost:'([A-Za-z0-9:\?_\-\.&\\/=]+)/)[1];
        ppft_re = str.match(/sFTTag:'.*value=\"(.*)\"\/>'/)[1];
        
        xlaCache.set('url_post', url_post, 0, function(err,success) {
          if( !err && success ){
            //console.log('url_post cached');
          } 
          else {
            console.log('cache set failed for url_post' );
          }
        })
        xlaCache.set('ppft_re', ppft_re, 0, function(err,success) {
          if( !err && success ){
            //console.log('ppft_re cached');
          } 
          else {
            console.log('cache set failed for ppft_re');
          }
        })
        callback({url_post: url_post, ppft_re: ppft_re});
      });
    });
    xruReq.on('socket', function (socket) {
      socket.setTimeout(12000);
    });
    xruReq.on('error', function (err) {
      console.log(err);
    });
    xruReq.end();
  }
  else {
    callback({url_post: url_post, ppft_re: ppft_re});
  }
  
  
}

xla.FetchInitialAccessToken = function(callback) {
  var access_token = null;
  var url_post = null;
  var ppft_re = null;
  var parsed_url_post = null;
  var cookie = null;
  
  xlaCache.get("access_token", function(err, value) {
    if (!err && value) {
      access_token = value;
      callback(access_token);
    }
    else {
      var access_token_callback = function (response) {
        var cookie = response.headers['set-cookie'];
        var cookies = '';
        var a_cookie;
        for(var i = 0; i < cookie.length; i++) {
          a_cookie = cookie_parser.parse(cookie[i]);
          var keys = Object.keys(a_cookie);
          var desired_key = keys[0];
          var desired_value = a_cookie[desired_key];

          cookies += desired_key + "=" + desired_value;
          if (i < cookie.length - 1)
            cookies += "; ";
        }
    
        xlaCache.set('cookie', cookies, 0, function(err, success) {
          if (err) {
            console.log("Failed to save the cookie");
          }
        });
        
        var str = '';
        response.on('data', function(chunk) {
          str += chunk;
        });
        response.on('end', function () {
          access_token = response.headers.location.match(/access_token=(.+?)&/)[1]
          xlaCache.set('access_token', access_token, 0, function(err,success) {
            if( !err && success ) {
              //console.log('access_token cached');
            } 
            else {
              console.log('cache set failed for access_token' );
            }
          });
          
          callback(access_token);
        });
      };
    
      var pre_auth_data = function (response) {
        var ppft_re = response['ppft_re'];
        var url_post = response['url_post'];
        xlaCache.get('cookie', function(err, value) {
          if (err) {
            console.log("Failed to get cookie from cache, this shouldn't happen");
          }
          else {
            //console.log("Something else happened");
          }
          cookie = value;
        });
        var post_vals = {
          'login': xla.username,
          'passwd': xla.password,
          'PPFT': ppft_re,
          'PPSX': 'Passpor',
          'SI': "Sign In",
          'type': '11',
          'NewUser': '1',
          'LoginOptions': '1',
          'i3': '36728',
          'm1': '768',
          'm2': '1184',
          'm3': '0',
          'i12': '1',
          'i17': '0',
          'i18': '__Login_Host|1',
          
        };
        var post_vals_qs = querystring.stringify(post_vals);
        parsed_url_post = url.parse(url_post);
     
        var request_options = {
          host: 'login.live.com',
          path: parsed_url_post['path'],
          method: 'POST',
          headers: {
            Cookie: cookie,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(post_vals_qs,'utf8'),
          },
        };
        var access_token = https.request(request_options, access_token_callback);
        access_token.write(post_vals_qs);
        access_token.on('socket', function (socket) {
          socket.setTimeout(12000);
        });
        access_token.on('error', function (err) {
          console.log(err);
        });
        access_token.end();
      }  
      xla.FetchPreAuthData(pre_auth_data);
    };
  });
};

xla.Authenticate = function (callback) {
  var access_token = '';
  var token = '';
  var uhs = '';
  var notAfter = '';
  var cookie = '';
  
  xlaCache.get('token', function(token_err, token_value) {
    if (!token_err && token_value) {
      xlaCache.get('uhs', function(uhs_err, uhs_value) {
        if (!uhs_err && uhs_value) {
          xlaCache.get('notAfter', function (notAfter_err, notAfter_value) {
            if (!notAfter_err && notAfter_value) {
              callback(token_value, uhs_value, notAfter_value);
            }
          });
          
        }
      });
    }
    else {
      xla.FetchInitialAccessToken(function(access_token) {
        xlaCache.get('cookie', function(err, value) {
          if (err) {
            console.log("Failed to get cookie from cache, this shouldn't happen");
          }

          cookie = value;
        });
        
        var payload = {
          'RelyingParty': 'http://auth.xboxlive.com',
          'TokenType': 'JWT',
          'Properties': {
            'AuthMethod': 'RPS',
            'SiteName': 'user.auth.xboxlive.com',
            'RpsTicket': access_token,
          }
        };
        
        var request_options = {
          hostname: 'user.auth.xboxlive.com',
          method: 'POST',
          path: '/user/authenticate',
          //path: '/raw',
          headers: {
            Cookie: cookie,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(JSON.stringify(payload),'utf8'),
          }
        }
        
        var authentication = https.request(request_options, function(response) {
          if (response.statusCode != '200') console.log("Authentication XBL statusCode: ", response.statusCode);
          
          var str = '';
          response.on('data', function(chunk) {
            str += chunk;
          });
          response.on('end', function() {
            try {
              str = JSON.parse(str);
            } catch (e) {
              return console.error(e);
            }
            notAfter = str.NotAfter;
            token = str.Token;
            uhs = str.DisplayClaims.xui[0].uhs;
            xlaCache.set('notAfter', notAfter, 0, function (err, success) {
              if (err)
                console.log("Failed to cache notAfter value");
            });
            xlaCache.set('token', token, 0, function (err, success) {
              if (err)
                console.log("Failed to cache token value");
            });
            xlaCache.set('uhs', uhs, 0, function(err, success) {
              if (err)
                console.log("Failed to cache uhs value");
            });
            callback(token, uhs, notAfter);
          });
        });
      
        authentication.write(JSON.stringify(payload));
        authentication.on('socket', function (socket) {
          socket.setTimeout(12000);
        });
        authentication.on('error', function (err) {
          console.log(err);
        });
        authentication.end();
        
      });
    };
  });
}


xla.GetAuthorization = function(callback) {
  var cookie = '';
  var xid = '';
  var token = '';
  var notAfter = '';
  var authorizationHeader;
  xlaCache.get('notAfter', function(err, value) {
    if (!err && value) {
      notAfter = convertToTimestamp(value);
      if (notAfter - 1000 < Math.floor(Date.now() / 1000)) {
        // start over
        xlaCache.flushAll();
        xla.GetAuthorization(callback);
      }
    }
  });
  xlaCache.get("authorizationHeader", function(err, value) {
    if (!err && value) {
      callback(value);
    }
    else {
      xla.Authenticate(function(token, uhs, notAfter) {
        
        xlaCache.get('cookie', function(err, value) {
          if (err) {
            console.log("Failed to get cookie from cache, this shouldn't happen");
          }

          cookie = value;
        });
      
        var payload = {
          RelyingParty: 'http://xboxlive.com',
          TokenType: 'JWT',
          Properties: {
            UserTokens: [token],
            SandboxId: 'RETAIL',
          }
        };
        
        var request_options = {
          hostname: 'xsts.auth.xboxlive.com',
          path: '/xsts/authorize',
          //path: '/raw',
          method: 'POST',
          headers: {
            Cookie: cookie,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(JSON.stringify(payload),'utf8'),
          },
        };
        
        var authorization = https.request(request_options, function(response) {
          
          if (response.statusCode != '200') console.log("Authorization XBL statusCode: ", response.statusCode);
        
          var str = '';
          response.on('data', function(chunk) {
            str += chunk;
          });
          response.on('end', function() {
            try {
              str = JSON.parse(str);
            } catch (e) {
              return console.error(e);
            }
            xid = str.DisplayClaims.xui[0].xid;
            uhs = str.DisplayClaims.xui[0].uhs;
            notAfter = str.NotAfter;
            token = str.Token;
            authorizationHeader = 'XBL3.0 x=' + uhs + ';' + token;
            
            xlaCache.set('notAfter', notAfter, 0, function (err, success) {
              if (err)
                console.log("Failed to cache notAfter value");
            });
            xlaCache.set('authorizationHeader', authorizationHeader, 0, function(err, success) {
              if (err)
                console.log("Failed to cache authorizationHeader");
            });
            callback(authorizationHeader);
          });
        });
        
        authorization.write(JSON.stringify(payload));
        authorization.on('socket', function (socket) {
          socket.setTimeout(12000);
        });
        authorization.on('error', function (err) {
          console.log(err);
        });
        authorization.end();
      });
    }
  });
  
}

xla.GetXuid = function(gamertag, callback) {
  var cookie = '';
  xlaCache.get('xuidForGamertag-' + gamertag, function(err, value) {
    if (!err && value) {
      callback(value);
    }
    else {
        xla.GetAuthorization(function (authorizationHeader) {  
        xlaCache.get('cookie', function(err, value) {
          if (err) {
            console.log("Failed to get cookie from cache, this shouldn't happen");
          }
         
          cookie = value;
        });
        var request_options = {
          hostname: 'profile.xboxlive.com',
          path: '/users/gt(' + encodeURIComponent(gamertag) + ')/profile/settings',
          //path: '/raw',
          method: 'GET',
          headers: {
            Cookie: cookie,
            'Content-Type': 'application/json',
            'x-xbl-contract-version': '2',
            'User-Agent': xla.useragent + ' Like SmartGlass/2.105.0415 CFNetwork/711.3.18 Darwin/14.0.0',
            'Authorization': authorizationHeader,

          }
        };

        var getXuid = https.request(request_options, function(response) {
          if (response.statusCode != '200') console.log("Get xuid XBL statusCode: ", response.statusCode);
          
          var str = '';
          response.on('data', function(chunk) {
            str += chunk;
          });
          response.on('end', function() {
            try {
              str = JSON.parse(str);
            } catch (e) {
              callback(-1);
              return console.error(e);
            }
            if (!str.profileUsers || !str.profileUsers.length) str.profileUsers = [{id: -1}];
            xlaCache.set('xuidForGamertag-' + gamertag, str.profileUsers[0].id, 0, function(err, success) {
              if (err)
                console.log("Failed to cache xuidForGamertag for " + gamertag);
            });
            callback(str.profileUsers[0].id);
          });
        });
        
        getXuid.on('socket', function (socket) {
          socket.setTimeout(12000);
        });
        getXuid.on('error', function (err) {
          console.log(err);
          callback(-1);
        });
        getXuid.end();
      });
    }
  });

}

xla.GetClipsForGamer = function(gamertag, titleid, continueToken, callback) {
  var cookie = '';
  var path = '';
  
  xla.GetAuthorization(function (authorizationHeader) {
    xla.GetXuid(gamertag, function(xuid) {
      if (xuid < 0) {
      //  console.log('no xuid found')
        return callback({"gameClips":[],"pagingInfo":{"continuationToken":null},"noXuid":true});
      }
      xlaCache.get('cookie', function(err, value) {
        if (err) {
          console.log("Failed to get cookie from cache, this shouldn't happen");
        }

        cookie = value;
      });
  
      if (continueToken != '') {
        path = '/users/xuid(' + encodeURIComponent(xuid) + ')/titles/' + encodeURIComponent(titleid) + '/clips?maxItems=25&continuationToken=' + encodeURIComponent(continueToken);
      }
      else {
        path = '/users/xuid(' + encodeURIComponent(xuid) + ')/titles/' + encodeURIComponent(titleid) + '/clips?maxItems=25';
      }
      
      var request_options = {
        hostname: 'gameclipsmetadata.xboxlive.com',
        path: path,
        method: 'GET',
        headers: {
          Cookie: cookie,
          'Content-Type': 'application/json',
          'x-xbl-contract-version': '2',
          'User-Agent': xla.useragent + ' Like SmartGlass/2.105.0415 CFNetwork/711.3.18 Darwin/14.0.0',
          'Authorization': authorizationHeader,
        }
      };

      var getClipsForGamer = https.request(request_options, function(response) {
        if (response.statusCode != '200') console.log("Get Clips for Gamer XBL statusCode: ", response.statusCode);

        var str = '';
        response.on('data', function(chunk) {
          str += chunk;
        });
        response.on('end', function() {
          try {
            str = JSON.parse(str);
          } catch (e) {
            callback({"gameClips":[],"pagingInfo":{"continuationToken":null},"jsonParseFail":true})
            return console.error(e);
          }
          callback(str);
          return;
        });
      });

      getClipsForGamer.on('socket', function (socket) {
        socket.setTimeout(12000);
      });
      getClipsForGamer.on('error', function (err) {
        console.log(err);
      });
      getClipsForGamer.end();
    });
  });
}

xla.GetDetailsForClip = function(gamertag, titleid, clipId, callback) {
  var continueToken = '';
  
  var detailsCallback = function(clipData) {
    continueToken = clipData.pagingInfo.continuationToken;
    for (var i = 0; i < clipData.gameClips.length; i++) {
      if (clipData.gameClips[i].gameClipId == clipId) {
        callback(clipData.gameClips[i]);
        return;
      }
    }
    
    if (continueToken)
      xla.GetClipsForGamer(gamertag, titleid, continueToken, detailsCallback);
    else {
      callback();
    }
  }
  
  xla.GetClipsForGamer(gamertag, titleid, continueToken, detailsCallback);
}

xla.showLogin = function() {
  console.log(xla.username);
  console.log(xla.password);
}
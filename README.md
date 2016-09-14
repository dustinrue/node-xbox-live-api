# Xbox Live API for Nodejs

Xbox Live API client used on http://guardian.theater. It currently will only get current GameDVR clips and expects you to pass in a game id.

Example Usage:

npm install xbox-live-api then

```javascript
var xla = require('xbox-live-api');

xla.username = <xbox live username>
xla.password = <xbox live password>
xla.useragent = <some user agent string> 

xla.GetClipsForGamer('P3', '247546985', '', function(json) {
  console.log(json);
});
```

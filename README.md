# Xbox Live API for Nodejs

Xbox Live API client used on http://guardian.theater. Currently able to return up to 200 GameDVR clips or screenshots. Xbox Live limits how
many clips and screenshots you have so 200 will usually return everything. 

==Example Usage:==

npm install xbox-live-api then

```javascript
var xla = require('xbox-live-api');

xla.username = <xbox live username>
xla.password = <xbox live password>
xla.useragent = <some user agent string> 

xla.GetClipsForGamer('P3', '', '', function(json) {
  console.log(json);
});

xla.GetScreenshotsForGamer('P3', '', '', function(json) {
  console.log(json);
});

xla.GetXuid('P3', function(json) {
  console.log(json);
});
```

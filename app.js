const path = require('path');
const crypto = require("crypto");
const serve = require('koa-static');
const koaBody = require('koa-body');
const Koa = require('koa');
const app = new Koa();
const cors = require('kcors');
const admin = require("firebase-admin");
const secret = require("./secret");

admin.initializeApp({
  credential: admin.credential.cert(secret.serviceAccount),
  databaseURL: secret.databaseURL,
  storageBucket: secret.storageBucket
});
const bucket = admin.storage().bucket();

function upload(image) {
  return new Promise(resolve => {
      const tempPath = image.path;
      const options = {
        destination: crypto.randomBytes(20).toString('hex')
      };
      bucket.upload(tempPath, options, function (err, file) {
        file.getSignedUrl({
          action: 'read',
          expires: '03-17-2025'
        }, function (err, url) {
          if (err) {
            console.error(err);
            return;
          }
          resolve(url);
        })
      })
    }
  )
}

app.use(cors());
app.use(koaBody({multipart: true}));
app.use(serve(path.join(__dirname, '/public')));

app.use(async (ctx, next) => {
  await next();
  if (ctx.body || !ctx.idempotent) return;
  ctx.redirect('/404.html');
});

app.use(async (ctx, next) => {
  if ('POST' !== ctx.method) return await next();
  const image = ctx.request.body.files['IMAGE'];
  const imageUrl = await upload(image);
  ctx.body = JSON.stringify({imageUrl: imageUrl});
});

const { PORT = 3000 } = process.env;
app.listen(PORT);
console.log('listening on port: ', PORT);
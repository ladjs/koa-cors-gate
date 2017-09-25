const test = require('ava');
const cors = require('kcors');
const _ = require('koa-route');
const CorsGate = require('../');
const { beforeEach, afterEach, koaRequest, ok } = require('./helpers');

test.beforeEach(beforeEach);
test.afterEach(afterEach);

test('returns itself', t => {
  const corsGate = new CorsGate({
    origin: 'http://localhost'
  });
  t.true(corsGate instanceof CorsGate);
});

test('requires origin paramameter', t => {
  const error = t.throws(() => {
    new CorsGate();
  }, TypeError);
});

test('should allow same-origin requests', async t => {
  const { app } = t.context;

  app.use(
    new CorsGate({
      allowSafe: false,
      origin: 'http://localhost'
    }).middleware
  );

  app.use(_.get('/get', ok));

  const res = await koaRequest(app)
    .get('/get')
    .set('origin', 'http://localhost');

  t.is(200, res.status);
});

test('should allow same-origin POST requests', async t => {
  const { app } = t.context;

  app.use(
    new CorsGate({
      allowSafe: false,
      origin: 'http://localhost'
    }).middleware
  );

  app.use(_.post('/post', ok));

  const res = await koaRequest(app)
    .post('/post')
    .set('origin', 'http://localhost');

  t.is(200, res.status);
});

test('should allow permitted cross-origin requests', async t => {
  const { app } = t.context;

  app.use(
    cors({
      origin: 'http://localhost:8080'
    })
  );

  app.use(
    new CorsGate({
      allowSafe: false,
      origin: 'http://localhost'
    }).middleware
  );

  app.use(_.post('/post', ok));

  const res = await koaRequest(app)
    .post('/post')
    .set('origin', 'http://localhost:8080');

  t.is(200, res.status);
});

test('should allow wildcard origins', async t => {
  const { app } = t.context;

  app.use(
    cors({
      origin: '*'
    })
  );

  app.use(
    new CorsGate({
      allowSafe: false,
      origin: 'http://localhost'
    }).middleware
  );

  app.use(_.post('/post', ok));

  const res = await koaRequest(app)
    .post('/post')
    .set('origin', 'http://localhost:8080');

  t.is(200, res.status);
});

test('should reject requests without origin', async t => {
  const { app } = t.context;

  app.use(
    new CorsGate({
      origin: 'http://localhost'
    }).middleware
  );

  app.use(_.post('/post', ok));

  const res = await koaRequest(app)
    .post('/post')
    .set('origin', 'http://localhost:8080');

  t.is(403, res.status);
});

test('should reject requests from other origins', async t => {
  const { app } = t.context;

  app.use(
    cors({
      origin: 'http://localhost:8080'
    })
  );

  app.use(
    new CorsGate({
      allowSafe: false,
      origin: 'http://localhost'
    }).middleware
  );

  app.use(_.post('/post', ok));

  const res = await koaRequest(app)
    .post('/post')
    .set('origin', 'https://mixmax.com');

  t.is(403, res.status);
});

test('should allow unspecified safe requests', async t => {
  const { app } = t.context;

  app.use(
    new CorsGate({
      strict: true,
      allowSafe: true,
      origin: 'http://localhost'
    }).middleware
  );

  app.use(_.get('/get', ok));

  const res = await koaRequest(app).get('/get');

  t.is(200, res.status);
});

test('should reject unspecified safe requests', async t => {
  const { app } = t.context;

  app.use(
    new CorsGate({
      strict: true,
      allowSafe: false,
      origin: 'http://localhost'
    }).middleware
  );

  app.use(_.get('/get', ok));

  const res = await koaRequest(app).get('/get');

  t.is(403, res.status);
});

test('should permit requests without origin', async t => {
  const { app } = t.context;

  app.use(
    new CorsGate({
      strict: false,
      origin: 'http://localhost'
    }).middleware
  );

  app.use(_.post('/post', ok));

  const res = await koaRequest(app).post('/post');

  t.is(200, res.status);
});

test('should not be invoked for same-origin requests', async t => {
  const { app } = t.context;

  app.use(
    new CorsGate({
      allowSafe: false,
      origin: 'http://localhost',
      failure(ctx) {
        ctx.status = 403;
      }
    }).middleware
  );

  app.use(_.post('/post', ok));

  const res = await koaRequest(app)
    .post('/post')
    .set('origin', 'http://localhost');

  t.is(200, res.status);
});

test('should be invoked for requests without origin', async t => {
  const { app } = t.context;

  app.use(
    new CorsGate({
      origin: 'http://localhost',
      failure(ctx) {
        ctx.status = 204;
      }
    }).middleware
  );

  app.use(_.post('/post', ok));

  const res = await koaRequest(app).post('/post');

  t.is(204, res.status);
});

test('should be invoked for requests from other origins', async t => {
  const { app } = t.context;

  app.use(
    cors({
      origin: 'http://localhost:8080'
    })
  );

  app.use(
    new CorsGate({
      origin: 'http://localhost',
      failure(ctx) {
        ctx.status = 204;
      }
    }).middleware
  );

  app.use(_.post('/post', ok));

  const res = await koaRequest(app)
    .post('/post')
    .set('origin', 'https://mixmax.com');

  t.is(204, res.status);
});

test('should patch origin', async t => {
  const { app } = t.context;

  app.use(CorsGate.originFallbackToReferrer());

  app.use(
    _.get('/get', ctx => {
      const correctOrigin = ctx.req.headers.origin === 'http://localhost';

      ctx.status = correctOrigin ? 200 : 403;
    })
  );

  const res = await koaRequest(app)
    .get('/get')
    .set('referer', 'http://localhost/home');

  t.is(200, res.status);
});

test('should not overwrite origin', async t => {
  const { app } = t.context;

  app.use(CorsGate.originFallbackToReferrer());

  app.use(
    _.get('/get', ctx => {
      const correctOrigin = ctx.req.headers.origin === 'http://localhost';

      ctx.status = correctOrigin ? 200 : 403;
    })
  );

  // This scenario won't technically occur in the wild
  // - the referer and origin should always match.
  const res = await koaRequest(app)
    .get('/get')
    .set('referer', 'http://localhost:8080/home')
    .set('origin', 'http://localhost');

  t.is(200, res.status);
});

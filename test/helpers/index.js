const Koa = require('koa');
const koaRequest = require('./koa-request');

const beforeEach = t => {
  const app = new Koa();
  Object.assign(t.context, { app });
};

const afterEach = () => {};

const ok = (ctx, next) => {
  ctx.status = 200;
  return next();
};

module.exports = {
  beforeEach,
  afterEach,
  koaRequest,
  ok
};

const Koa = require('koa');
const Router = require('koa-router');
const koaRequest = require('./koa-request');

const beforeEach = t => {
  const app = new Koa();
  const router = new Router();
  Object.assign(t.context, { app, router });
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

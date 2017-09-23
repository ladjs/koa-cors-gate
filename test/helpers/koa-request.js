const request = require('supertest');

module.exports = ({ app, router }) => {
  app.use(router.routes());
  return request(app.listen(0));
};

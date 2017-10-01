# [**koa-cors-gate**](https://github.com/ladjs/koa-cors-gate)

[![build status](https://img.shields.io/travis/ladjs/koa-cors-gate.svg)](https://travis-ci.org/ladjs/koa-cors-gate)
[![code coverage](https://img.shields.io/codecov/c/github/ladjs/koa-cors-gate.svg)](https://codecov.io/gh/ladjs/koa-cors-gate)
[![code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![made with lass](https://img.shields.io/badge/made_with-lass-95CC28.svg)](https://lass.js.org)
[![license](https://img.shields.io/github/license/ladjs/koa-cors-gate.svg)](<>)

> CORS gate for Koa

## Table of Contents

* [Install](#install)
* [Usage](#usage)
* [Contributors](#contributors)
* [License](#license)


## Install

[npm][]:

```sh
npm install koa-cors-gate
```

[yarn][]:

```sh
yarn add koa-cors-gate
```


## Usage

```js
const Koa = require('koa');
const CorsGate = require('koa-cors-gate');

const app = new Koa();

app.use(
  new CorsGate({
    allowSafe: false,
    origin: 'http://localhost'
  }).middleware
);
```

### Alternative failure handling

By default, `koa-cors-gate` will return `403 Unauthorized` to any requests that aren't permitted by the specified options.

The `failure` option offers a means to change this behavior. This way, unauthorized cross-origin requests can be permitted in a restricted manner - perhaps by requiring an explicit authentication mechanism rather than cookie-based authentication to prevent cross-site scripting. As such, `cors-gate` can serve as a CSRF mechanism without the need for a token, while still allowing limited forms of third-party cross-origin API requests.

```js
app.use(new CorsGate({
  origin: 'http://localhost',
  failure: ({req, res}, next) => {
    // requests from other origins will have this flag set.
    req.requireExplicitAuthentication = true;
  }
}).middleware);
```

### Firefox and the Origin header

Firefox does not set the `Origin` header [on same-origin requests](http://stackoverflow.com/a/15514049/495611) (see also [csrf-request-tester](https://github.com/mixmaxhq/csrf-request-tester)) for same-origin requests, as of version 53. The `corsGate.originFallbackToReferrer` middleware will, if the `Origin` header is missing, fill it with the origin part of the `Referer`. This middleware thus enables verification of the `Origin` for same-origin requests.

Additionally, no browser sends the `Origin` header when sending a `GET` request to load an image. We could simply allow all `GET` requests - `GET` requests are safe, per `HTTP` - but we'd rather reject unauthorized cross-origin `GET` requests wholesale.

At present, Chrome and Safari do not support the `strict-origin` `Referrer-Policy`, so we can only patch the `Origin` from the `Referer` on Firefox. In patching it, however, we can reject unauthorized cross-origin `GET` requests from images, and once Chrome and Safari support `strict-origin`, we'll be able to do so on all three platforms.

In order to actually reject these requests, however, the patched `Origin` data must be visible to the `cors` middleware. This middleware is distinct because it must appear before `cors` and `corsGate` to perform all the described tasks.

```js
app.use(corsGate.originFallbackToReferrer());
app.use(cors({ ... }));
app.use(new CorsGate({ ... }));
```


## Contributors

| Name             | Website            |
| ---------------- | ------------------ |
| **Alexis Tyler** | <https://wvvw.me/> |


## Trademark Notice

Lad, Lass, and their respective logos are trademarks of Niftylettuce LLC.
These trademarks may not be reproduced, distributed, transmitted, or otherwise used, except with the prior written permission of Niftylettuce LLC.
If you are seeking permission to use these trademarks, then please [contact us](mailto:niftylettuce@gmail.com).


## License

[MIT](LICENSE) © [Nick Baugh](http://niftylettuce.com)


##

[npm]: https://www.npmjs.com/

[yarn]: https://yarnpkg.com/

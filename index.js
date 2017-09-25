const url = require('url');
const autoBind = require('auto-bind');
const Debug = require('debug');

const debug = new Debug('koa-cors-gate');

/**
 * If the Origin header is missing, fill it with the origin part of the Referer.
 *
 * Firefox does not send the Origin header for same-origin requests, as of version 53. This is a
 * documented bug, so this middleware enables verification of the Origin in that case. Additionally,
 * no browser sends the Origin header when sending a GET request to load an image. We could simply
 * allow all GET requests - GET requests are safe, per HTTP - but we'd rather reject unauthorized
 * cross-origin GET requests wholesale.
 *
 * At present, Chrome and Safari do not support the strict-origin Referrer-Policy, so we can only
 * patch the Origin from the Referer on Firefox. In patching it, however, we can reject unauthorized
 * cross-origin GET requests from images, and once Chrome and Safari support strict-origin, we'll
 * be able to do so on all three platforms.
 *
 * In order to actually reject these requests, however, the patched Origin data must be visible to
 * the cors middleware. This middleware is distinct because it must appear before cors and corsGate
 * to perform all the described tasks.
 */
const originFallbackToReferrer = () => {
  return async ({ req }, next) => {
    const origin = req.headers.origin;
    if (!origin) {
      const ref = req.headers.referer;
      if (ref) {
        const parts = url.parse(ref);
        const { protocol, host } = parts;
        req.headers.origin = url.format({
          protocol,
          host
        });
      }
    }
    debug('originFallbackToReferrer');
    return next();
  };
};

/**
 * Gate requests based on CORS data. For requests that are not permitted via CORS, invoke the
 * failure options callback, which defaults to rejecting the request.
 *
 * @param {Object} options
 * @param {String} options.origin The origin of the server - requests from this origin will always proceed.
 * @param {Boolean=} options.strict Whether to reject requests that lack an Origin header. Defaults to true.
 * @param {Boolean=} options.allowSafe Whether to enforce the strict mode for safe requests (HEAD, GET). Defaults to true.
 * @param {Function=} options.failure A standard Koa-style callback for handling failure.
 *   Defaults to rejecting the request with 403 Unauthorized.
 */
class Script {
  constructor(options = {}) {
    options = Object.assign(
      {
        strict: true,
        allowSafe: true
      },
      options
    );

    if (options.failure) {
      debug('failure passed in options');
      this.failure = options.failure;
      delete options.failure;
    }

    this.options = options;

    if (
      !options.originFallbackToReferrer &&
      typeof this.options.origin !== 'string'
    ) {
      throw new TypeError(`Must specify the server's origin.`);
    }

    autoBind(this);
  }

  async middleware(ctx, next) {
    const { req, res } = ctx;
    const { options, failure } = this;

    if (options.originFallbackToReferrer) {
      return originFallbackToReferrer(ctx, next);
    }

    const thisOrigin = options.origin.toLowerCase();
    const origin = (req.headers.origin || '').toLowerCase().trim();

    if (!origin) {
      debug('origin missing');
      // Fail on missing origin when in strict mode
      // but allow safe requests if allowSafe set.
      if (
        options.strict &&
        (!options.allowSafe || ['GET', 'HEAD'].indexOf(ctx.method) === -1)
      ) {
        return failure(ctx, next);
      }

      return next();
    }

    // Always allow same-origin requests.
    if (origin === thisOrigin) {
      debug('same-origin match');
      return next();
    }

    // Now this is a cross-origin request.
    // Check if we should allow it based on headers set by
    // previous CORS middleware. Note that `getHeader` is case-insensitive.
    const otherOrigin = (res.getHeader('access-control-allow-origin') || '')
      .toLowerCase()
      .trim();

    // Two values: allow any origin, or a specific origin.
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS#Access-Control-Allow-Origin
    if (otherOrigin === '*' || origin === otherOrigin) {
      debug('matched origin or wildcard');
      return next();
    }

    // CSRF! Abort.
    failure(ctx, next);
  }

  async failure(ctx) {
    debug('failure');
    ctx.status = 403;
  }
}

module.exports = Script;

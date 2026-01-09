export function createExpressResponse() {
  const response = {
    statusCode: 200,
    headers: {},
    body: undefined
  };

  const res = {
    status(code) {
      response.statusCode = code;
      return res;
    },
    json(payload) {
      response.headers = {
        'Content-Type': 'application/json',
        ...response.headers
      };
      response.body = JSON.stringify(payload);
      return res;
    },
    send(payload) {
      response.body = payload;
      return res;
    },
    set(headers) {
      response.headers = {
        ...response.headers,
        ...headers
      };
      return res;
    }
  };

  return { res, response };
}

export function toExpressRequest(req, { params = {} } = {}) {
  let body = req.body;

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (error) {
      body = req.body;
    }
  }

  if (Buffer.isBuffer(body)) {
    const bodyText = body.toString('utf8');
    try {
      body = JSON.parse(bodyText);
    } catch (error) {
      body = bodyText;
    }
  }

  return {
    body,
    params,
    query: req.query ?? {},
    method: req.method,
    headers: req.headers ?? {}
  };
}

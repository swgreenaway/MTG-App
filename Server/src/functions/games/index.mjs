import { createGame } from '../../controllers/gamesController.mjs';
import { createExpressResponse, toExpressRequest } from '../shared/expressAdapter.mjs';

export default async function (context, req) {
  if (req.method?.toLowerCase() !== 'post') {
    context.res = {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
    return;
  }

  const { res, response } = createExpressResponse();
  const expressReq = toExpressRequest(req);

  await createGame(expressReq, res);

  context.res = response;
}

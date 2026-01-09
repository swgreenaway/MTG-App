import { getCardDetails, searchCommanderSuggestions } from '../../controllers/cardsController.mjs';
import { createExpressResponse, toExpressRequest } from '../shared/expressAdapter.mjs';

const notFoundResponse = {
  statusCode: 404,
  body: 'Not Found'
};

const runController = async (context, req, controller, params = {}) => {
  const { res, response } = createExpressResponse();
  const expressReq = toExpressRequest(req, { params });

  await controller(expressReq, res);

  context.res = response;
};

const decodeSegment = (segment) => {
  if (!segment) {
    return segment;
  }

  try {
    return decodeURIComponent(segment);
  } catch (error) {
    return segment;
  }
};

export default async function (context, req) {
  const rawSegments = req.params?.segments ?? '';
  const segments = rawSegments.split('/').filter(Boolean);
  const [first, second] = segments;

  if (first === 'details' && second) {
    const name = decodeSegment(second);
    await runController(context, req, getCardDetails, { name });
    return;
  }

  if (first === 'search' && second === 'commanders') {
    await runController(context, req, searchCommanderSuggestions);
    return;
  }

  context.res = notFoundResponse;
}

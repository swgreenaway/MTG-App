import {
  getMostPlayed,
  commanderWinRate,
  playerWinRate,
  getColorFreq,
  getGameFeed,
  getHeadToHead,
  getTotalGamesCount,
  getUniquePlayerCount,
  getAverageGameLength
} from '../../controllers/statsController.mjs';
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
  const [first, second, third] = segments;

  if (!first) {
    context.res = notFoundResponse;
    return;
  }

  if (first === 'most-played') {
    await runController(context, req, getMostPlayed);
    return;
  }

  if (first === 'commanders' && second === 'win-rate') {
    const name = decodeSegment(third);
    await runController(context, req, commanderWinRate, name ? { name } : {});
    return;
  }

  if (first === 'players' && second === 'win-rate') {
    const name = decodeSegment(third);
    await runController(context, req, playerWinRate, name ? { name } : {});
    return;
  }

  if (first === 'colors' && second === 'frequency') {
    const name = decodeSegment(third);
    await runController(context, req, getColorFreq, name ? { name } : {});
    return;
  }

  if (first === 'game-feed') {
    const name = decodeSegment(second);
    await runController(context, req, getGameFeed, name ? { name } : {});
    return;
  }

  if (first === 'players' && second === 'head-to-head' && third) {
    const name = decodeSegment(third);
    await runController(context, req, getHeadToHead, { name });
    return;
  }

  if (first === 'total-games') {
    await runController(context, req, getTotalGamesCount);
    return;
  }

  if (first === 'unique-players') {
    await runController(context, req, getUniquePlayerCount);
    return;
  }

  if (first === 'avg-game-length') {
    await runController(context, req, getAverageGameLength);
    return;
  }

  context.res = notFoundResponse;
}

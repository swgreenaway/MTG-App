import { Router } from 'express';
import { getCardDetails, searchCommanderSuggestions } from '../controllers/cardsController.mjs';

const router = Router();

router.get('/details/:name', getCardDetails);
router.get('/search/commanders', searchCommanderSuggestions);

export default router;
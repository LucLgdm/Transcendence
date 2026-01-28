import { Router } from 'express';
import { SomeController } from '../controllers/index';

const router = Router();
const controller = new SomeController();

router.get('/some-endpoint', controller.someMethod.bind(controller));
router.post('/another-endpoint', controller.anotherMethod.bind(controller));

export default router;
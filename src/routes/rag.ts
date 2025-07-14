import express, {Express, Request, Response} from 'express';
import { RagService } from '../service/rag';

const router = express.Router();

router.get('/run', async (req: Request, res: Response) => {
    const rag = new RagService();

    const data = await rag.run_rag();
    console.log(data);
    res.send(data);
});

export default router;
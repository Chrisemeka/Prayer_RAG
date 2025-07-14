import express, {Express, Request, Response} from 'express';
import { BibleDataIngestion } from '../service/data_ingestion';

const router = express.Router();

router.get('/ingestion', async (req: Request, res: Response) => {
    const ingestion = new BibleDataIngestion();

    const data = await ingestion.run_ingestion();
    console.log(data);
    res.send(data);
});

export default router;
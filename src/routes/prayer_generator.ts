import express, {Express, Request, Response} from 'express';
import { Inference } from '../service/inference';

const router = express.Router();
const inference = new Inference(); // Create once, reuse

router.post('/generate_prayer', async (req: Request, res: Response) => {
    try {
        if (!req.body.prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const data = await inference.therapeutic_chat_response(req.body.prompt);
        console.log("chat data:", data);

        res.status(200).json({ 
            success: true, 
            prayer: data 
        });

    } catch (error) {
        console.error('Error generating chat:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to generate chat' 
        });
    }
});

export default router;
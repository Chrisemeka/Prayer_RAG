import express, {Express, Response, Request} from 'express';
import dataRoute from './routes/data_ingestion';
import ragRoute from './routes/rag';
import dotenv from 'dotenv'

dotenv.config()

const app: Express = express();
const port = process.env.PORT || 5000;

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
})

app.use('/data', dataRoute);
app.use('/rag', ragRoute);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
})

import express, {Express, Response, Request} from 'express';
import dataRoute from './routes/data_ingestion';
// import ragRoute from './routes/rag';
import prayerGeneratorRoute from './routes/prayer_generator';
import dotenv from 'dotenv'

dotenv.config()

const app: Express = express();
const port = process.env.PORT || 5000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World!');
})

app.use('/data', dataRoute);
// app.use('/rag', ragRoute);
app.use('/prayer', prayerGeneratorRoute);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
})
 
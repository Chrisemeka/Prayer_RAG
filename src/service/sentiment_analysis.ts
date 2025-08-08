import { pipeline } from '@xenova/transformers';

export class SentimentAnalysis {

    async sentiment_analysis(prompt: string) {
        const sentiment = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');

        const result = await sentiment(prompt)

        return result
    }
}
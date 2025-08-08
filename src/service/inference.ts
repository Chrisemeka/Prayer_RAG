import express, {Express, Response, Request} from 'express';
import dotenv from 'dotenv'
import Groq from 'groq-sdk';
import { RagService } from '../service/rag';
import { SentimentAnalysis } from '../service/sentiment_analysis';

dotenv.config()

export class Inference {
    private ragService: RagService;
    private sentimentScore: SentimentAnalysis
    private groq: Groq;

    constructor() {
        this.ragService = new RagService();
        this.sentimentScore = new SentimentAnalysis();
        this.groq = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });
    }

    async therapeutic_chat_response(prompt: string) {
        interface SentimentResult {
            label: string;
            score: number;
        }

        try {
            const verse = await this.ragService.run_rag(prompt);
            const sentiment_result = await this.sentimentScore.sentiment_analysis(prompt) as SentimentResult[];

            console.log("currently in inference class therapeutic_chat_response method")

            console.log(sentiment_result);

            const sentiment_label = sentiment_result[0]?.label || 'NEUTRAL';
            const sentiment_confidence = sentiment_result[0]?.score || 0;
            
            let emotional_context = '';
            if (sentiment_label === 'NEGATIVE' && sentiment_confidence > 0.95) {
                emotional_context = 'Client is experiencing significant emotional distress or crisis';
            } else if (sentiment_label === 'NEGATIVE' && sentiment_confidence > 0.80) {
                emotional_context = 'Client appears to be struggling with difficult emotions';
            } else if (sentiment_label === 'POSITIVE' && sentiment_confidence > 0.90) {
                emotional_context = 'Client seems to be in a positive or hopeful emotional state';
            } else {
                emotional_context = 'Client appears to be processing emotions or seeking guidance';
            }

            const system_context = `You are a compassionate, licensed faith-based therapist having a genuine conversation with a client. 
            Your responses should:
            - Show deep empathy and understanding for their current emotional state
            - Ask thoughtful follow-up questions to better understand their situation
            - Gently integrate biblical wisdom and therapeutic techniques when appropriate
            - Validate their feelings without judgment
            - Offer practical coping strategies and insights
            - Maintain professional therapeutic boundaries while being warm and caring
            - Use conversational, accessible language (avoid clinical jargon)
            - Respond as if this is an ongoing therapeutic relationship
            - Keep responses to 2-3 paragraphs maximum for natural conversation flow
            - Adapt your tone based on their emotional needs (crisis support vs. gentle guidance)
            - If high distress is detected, prioritize immediate comfort and safety`;

            const user_prompt = `Client says: "${prompt}"

            Available resources from your knowledge base:
            Biblical guidance: ${verse.verse_result}
            Therapeutic techniques: ${verse.therapy_result}
            
            Emotional assessment: ${emotional_context}
            Sentiment: ${sentiment_label} (confidence: ${(sentiment_confidence * 100).toFixed(1)}%)
            
            Respond as their therapist would in session:
            1. Acknowledge what they've shared with empathy
            2. Reflect back what you're hearing emotionally
            3. Ask a gentle follow-up question or offer a supportive insight
            4. If appropriate, weave in relevant biblical wisdom or therapeutic technique naturally
            5. Help them feel heard, understood, and supported
            ${sentiment_label === 'NEGATIVE' && sentiment_confidence > 0.95 ? '6. PRIORITY: Provide immediate emotional support and assess for safety if needed' : ''}

            This should feel like a genuine therapeutic conversation, not a lecture or sermon.`;

            const response = await this.callGroqLLM(system_context, user_prompt);
            return response;

        } catch (error) {
            console.error('Error generating therapeutic response:', error);
        }
}

    private async callGroqLLM(systemContext: string, userPrompt: string): Promise<any> {
        try {
            const completion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content: systemContext
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                model: 'llama3-8b-8192',
                temperature: 0.7,
                max_tokens: 1024,
            });

            return completion.choices[0]?.message?.content || "No response generated";
        } catch (error) {
            console.error('Error calling Groq LLM:', error);
        }
    }
}
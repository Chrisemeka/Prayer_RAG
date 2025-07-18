import express, {Express, Response, Request} from 'express';
import dotenv from 'dotenv'
import Groq from 'groq-sdk';
import { RagService } from '../service/rag';

dotenv.config()

export class Inference {
    private ragService: RagService;
    private groq: Groq;

    constructor() {
        this.ragService = new RagService();
        this.groq = new Groq({
            apiKey: process.env.GROQ_API_KEY
        });
    }

    async prayer_generator(prompt: string) {

        try {
            const verse = await this.ragService.run_rag(prompt);

            console.log("currently in inference class prayer_generator method")
            console.log(verse);

            const system_context = `You are a compassionate chaplain who writes heartfelt, biblical prayers. 
            Your prayers should:
            - Address God directly and reverently
            - Reference the provided Bible verses naturally
            - Be personal and comforting
            - Use respectful, spiritual language
            - End with "Amen"
            - Be 2-3 paragraphs long`;

            const user_prompt = `Based on these Bible verses:

            ${verse}

            Write a heartfelt prayer for someone based on this theme: ${prompt}

            Please create a prayer that draws comfort and strength from these biblical passages.`;


            const response = await this.callGroqLLM(system_context, user_prompt);

            return response;
        } catch (error) {
            console.error('Error generating prayer:', error);
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
import prisma from '../prisma';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";

export class BibleDataIngestion{

    async loadBibleDataJson (filepath: string): Promise<any> {
        try {
            const fs = require('fs').promises;
        
            const bible_data = await fs.readFile(filepath, 'utf8');
            const jsonData = JSON.parse(bible_data);

            console.log("Bible data loaded successfully!")
            return jsonData
        } catch (error) {
            console.error("Error loading bible data: ", error)
        }
    }

    async transform_data_to_verses(verses: any[]): Promise<any> {
        try {
            const transformedData = verses.map((verse: any, index: number) => {
                const verse_id = `${verse.book_name.toLowerCase().replace(" ", "")}_${verse.chapter}_${verse.verse}`;
                const reference = `${verse.book_name} ${verse.chapter}:${verse.verse}`;
                return {
                    id: verse_id,
                    reference: reference,
                    text: verse.text,
                    book_name: verse.book_name,
                    book_number: verse.book,
                    chapter: verse.chapter,
                    verse: verse.verse,
                    text_length: verse.text.length,
                    embedding_id: `${verse_id}_vec`,
                    created_at: new Date(),
                    index: index
                }   
            })
            return transformedData
        } catch (error) {
            console.error("Error transforming data to verses: ", error)
        }
    }

    async upload_verses_to_sqlite(verses: any): Promise<any> {
        console.log("Uploading data to sqlite...");

        // transform all the verses in the bible data to sqlite rows
        const sqlite_rows = await this.transform_data_to_verses(verses);
        
        

        try {
            // batch upload into Sqlite in batches of 1000
            const batch_size = 1000;
            let total_inserted = 0;

            for (let i = 0; i < sqlite_rows.length; i += batch_size){
                const batch = sqlite_rows.slice(i, i + batch_size);
                const verses = await prisma.verses.createMany({
                    data: batch
                });
                total_inserted += batch.length

                console.log(`Uploaded: ${total_inserted}/${sqlite_rows.length}`)
            }
            console.log(`Succesfully uploaded ${total_inserted} verses in Sqlite!`)
        } catch (error) {
            console.error("Error uploading data to sqlite: ", error)
        }
    }

    async loadAndUploadTherapyManual(filepath: string): Promise<any> {
        try {
            const loader = new PDFLoader(filepath, {
            });

            const docs = await loader.load();

            const therapyData = docs.map((doc, index) => {
                const docId = `therapy_technique_${index +1}`
                const title = doc.pageContent.split('\n')[0].trim().toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, '_');

                return {
                    id: docId,
                    title: title,
                    content: doc.pageContent
                }
            })

            const uploadData = await prisma.therapy_Manual.createMany({
                data: therapyData
            });

            console.log("Uploaded Therapy Techniques Successfully!");
            return uploadData;

        } catch (error) {
            console.error("Error loading therapy manual data: ", error)
            return null
        }
    }

    async upload_therapy_manual_to_sqlite(docs: JSON){

    }

    async run_ingestion(){
        const bible_data = await this.loadBibleDataJson('./data/bible_data.json');  


        const verses = await this.upload_verses_to_sqlite(bible_data.verses);

        const therapy_techniques = await this.loadAndUploadTherapyManual('./data/therapy_techiniques.pdf')
    }
}
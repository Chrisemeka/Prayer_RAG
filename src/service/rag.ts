import e from 'express';
import prisma from '../prisma';
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/huggingface_transformers";
import * as lancedb from "@lancedb/lancedb";
import * as arrow from "apache-arrow";


export class RagService {

    async intialize_emebedding_model() {
        console.log("Loading embedding model!")

        try {
            const model = new HuggingFaceTransformersEmbeddings({ 
                model: 'sentence-transformers/all-MiniLM-L6-v2' 
            })

            console.log("Embedding model loaded successfully!");
            return model
        } catch (error) {
            console.log("Error loading embedding model: ", error)
            return null
        }
    }

    async initialize_verses_vector_store() {
        console.log("Loading vector store!");

        try {
            const db = await lancedb.connect("./lancedb_data");
            
            let table;
            
            try {
                table = await db.openTable("verses_vector_db");
                console.log("Opened existing table");
            } catch (error) {
                const schema = new arrow.Schema([
                    new arrow.Field("vector", new arrow.FixedSizeList(384, new arrow.Field("item", new arrow.Float32()))),
                    new arrow.Field("id", new arrow.Utf8()),
                    new arrow.Field("text", new arrow.Utf8()),
                    new arrow.Field("reference", new arrow.Utf8()),
                    new arrow.Field("book_name", new arrow.Utf8()),
                    new arrow.Field("chapter", new arrow.Int32()),
                    new arrow.Field("verse", new arrow.Int32())
                ]);
                
                table = await db.createEmptyTable("verses_vector_db", schema);
                console.log("Created new table");
            }

            console.log("Verse vector store loaded successfully!");
            return { db, table };
        } catch (error) {
            // console.log("Error loading vector store: ", error);
            throw new Error("Error loading verse vector store: " + error);
        }
    }

    async initialize_therapy_vector_store() {
        console.log("Loading vector store!");

        try {
            const db = await lancedb.connect("./lancedb_data");
            
            let table;
            
            try {
                table = await db.openTable("therapy_vector_db");
                console.log("Opened existing table");
            } catch (error) {
                const schema = new arrow.Schema([
                    new arrow.Field("vector", new arrow.FixedSizeList(384, new arrow.Field("item", new arrow.Float32()))),
                    new arrow.Field("id", new arrow.Utf8()),
                    new arrow.Field("title", new arrow.Utf8()),
                    new arrow.Field("content", new arrow.Utf8())
                ]);
                
                table = await db.createEmptyTable("therapy_vector_db", schema);
                console.log("Created new table");
            }

            console.log("Therapy vector store loaded successfully!");
            return { db, table };
        } catch (error) {
            // console.log("Error loading vector store: ", error);
            throw new Error("Error loading therapy vector store: " + error);
        }
    }

   async create_verse_embeddings_from_sqlite(model: any) {
    console.log("Creating verse embeddings from sqlite!");

        try {
            const verses = await prisma.verses.findMany({});
            console.log(`📊 Total verses to process: ${verses.length}`);
                        
            
            const batchSize = 50;
            const allData = [];
            const totalBatches = Math.ceil(verses.length / batchSize);
            
            console.log(`Processing in ${totalBatches} batches of ${batchSize}...`);
            
            for (let i = 0; i < verses.length; i += batchSize) {
                const batch = verses.slice(i, i + batchSize);
                const batchNum = Math.floor(i/batchSize) + 1;
                
                console.log(`Processing batch ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + batchSize, verses.length)})`);
                
                const batchData = await Promise.all(batch.map(async (verse: any) => {
                    const clean_text = verse.text.replace(/[^a-zA-Z0-9\s]/g, '');
                    const vector = await model.embedQuery(clean_text);
                    return {
                        id: verse.id,
                        vector: vector,
                        text: verse.text,
                        reference: verse.reference,
                        book_name: verse.book_name,
                        chapter: verse.chapter,
                        verse: verse.verse
                    }
                }));
                
                allData.push(...batchData);
            
            }
            
            console.log("Verses embeddings created successfully!");
            return allData;
        } catch (error) {
            console.error("Error creating verses embeddings from sqlite: ", error);
        }
    }

    async create_therapy_embeddings_from_sqlite(model: any) {
        const therapy = await prisma.therapy_Manual.findMany({})
        console.log(`📊 Total therapy to process: ${therapy.length}`);


        const allData = [];
        for (let i = 0; i < therapy.length; i++ ) {
            try {
                const therapyData = await Promise.all(therapy.map(async (therapy: any) => {
                const vector = await model.embedQuery(therapy.content);
                    return {
                        id: therapy.id,
                        vector: vector,
                        title: therapy.title,
                        content: therapy.content
                    }
                }));

                allData.push(...therapyData);

                console.log("Therapy embeddings created successfully!");
                return allData;
            } catch (error) {
                console.error("Error creating therapy embeddings from sqlite: ", error);
            }
        }

    }

    async update_vector_table(table: any, data: any, forceRefresh: boolean = false) {
        console.log("Updating vector table!");

        try {
            const existingCount = await table.countRows();

            if (existingCount && !forceRefresh) {
                console.log(`Table already contains records. Skipping insertion.`);
                return;
            }

            if (existingCount > 0 && forceRefresh) {
                console.log(`Clearing table before inserting new data.`);
            }

            await table.add(data);
            console.log("Vector table updated successfully!");
        } catch (error) {
            console.error("Error updating vector table: ", error)
        }
    }

    async verse_vector_search(model: any, query: string, table: any) {
        console.log("Converting the query to embeddings!");

        const query_vector = await model.embedQuery(query);
        
        console.log("Performing vector search!");

        const res = await table.search(query_vector).limit(10).toArray();

        const verses = res.map((result: any) => `${result.reference}: ${result.text}`).join('\n\n');
        console.log(verses);
        return verses;
    }

    async therapy_vector_search(model: any, query: string, table: any) {
        console.log("Converting the query to embeddings!");

        const query_vector = await model.embedQuery(query);
        
        console.log("Performing vector search!");

        const res = await table.search(query_vector).limit(10).toArray();

        const therapy = res.map((result: any) => `${result.reference}: ${result.text}`).join('\n\n');
        console.log(therapy);
        return therapy;
    }


    
    async run_rag(prompt: string) {
        console.log("Running rag!");

        const embedding_model = await this.intialize_emebedding_model();
        const verse_vector_store = await this.initialize_verses_vector_store();
        const therapy_vector_store = await this.initialize_therapy_vector_store();
        
        if (!embedding_model || !verse_vector_store || !therapy_vector_store) {
            console.log("Failed to initialize embedding model or vector store");
        }
        
        // Check if vector table has data
        const verseExistingCount = await verse_vector_store.table.countRows();
        const therapyExistingCount = await therapy_vector_store.table.countRows();
        
        if (verseExistingCount && therapyExistingCount === 0) {
            console.log("Verse or Therapy vector table is empty! Please run setup first:");
            console.log("npx ts-node src/scripts/setup_embeddings.ts");
            console.log("Please run the setup script first to initialize embeddings.");
        }
        
        
        const verse_result = await this.verse_vector_search(embedding_model, prompt, verse_vector_store.table);
        const therapy_result = await this.therapy_vector_search(embedding_model, prompt, therapy_vector_store.table);

        return {verse_result, therapy_result}
    }
}
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

    async initialize_vector_store() {
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

            console.log("Vector store loaded successfully!");
            return { db, table };
        } catch (error) {
            console.log("Error loading vector store: ", error);
            return null;
        }
    }

   async create_embeddings_from_sqlite(model: any) {
    console.log("Creating embeddings from mongodb!");

        try {
            const verses = await prisma.verses.findMany({});
            console.log(`📊 Total verses to process: ${verses.length}`);
            
            // Check for cached embeddings first
            const cacheFile = './data/embeddings_cache.json';
            
            try {
                const fs = require('fs').promises;
                const cachedData = await fs.readFile(cacheFile, 'utf8');
                const cached = JSON.parse(cachedData);
                
                if (cached.length === verses.length) {
                    console.log(`Found complete cached embeddings (${cached.length})!`);
                    return cached;
                } else {
                    console.log(`Cache incomplete (${cached.length}/${verses.length}), recreating...`);
                }
            } catch (error) {
                console.log("📝 No cache found, creating fresh embeddings...");
            }

            // Create embeddings with progress tracking
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
            
                
                // Small delay to prevent system overload
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Cache the results
            console.log("Caching embeddings for future use...");
            const fs = require('fs').promises;
            
            // Ensure data directory exists
            await fs.mkdir('./data', { recursive: true });
            await fs.writeFile(cacheFile, JSON.stringify(allData, null, 2));
            
            console.log("Embeddings created and cached successfully!");
            return allData;
        } catch (error) {
            console.error("Error creating embeddings from mongodb: ", error);
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

    async vector_search(model: any, query: string, table: any) {
        console.log("Converting the query to embeddings!");

        const query_vector = await model.embedQuery(query);
        
        console.log("Performing vector search!");

        const res = await table.search(query_vector).limit(5).toArray();

        const verses = res.map((result: any) => `${result.reference}: ${result.text}`).join('\n\n');
        console.log(verses);
        return verses;
    }

    // put a query parameter in the run_rag function
    async run_rag(prompt: string) {
        console.log("Running rag!");

        const embedding_model = await this.intialize_emebedding_model();
        const vector_store = await this.initialize_vector_store();
        
        if (!embedding_model || !vector_store) {
            console.log("Failed to initialize embedding model or vector store");
            return;
        }
        
        // Check if vector table has data
        const existingCount = await vector_store.table.countRows();
        
        if (existingCount === 0) {
            console.log("Vector table is empty! Please run setup first:");
            console.log("npx ts-node src/scripts/setup_embeddings.ts");
            return "Please run the setup script first to initialize embeddings.";
        }
        
        console.log(`Using ${existingCount} pre-computed vectors`);
        
        // Fast vector search (no embedding creation needed)
        return await this.vector_search(embedding_model, prompt, vector_store.table);
    }
}
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

    async create_embeddings_from_mongodb(model: any) {
        console.log("Creating embeddings from mongodb!");

        try {
            const verses = await prisma.verses.findMany({});

            const data = await Promise.all(verses.map( async(verse: any) => {
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
            }))

            console.log("Embeddings created successfully!");
            return data
        } catch (error) {
            console.error("Error creating embeddings from mongodb: ", error)
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
        
        // Check if both are not null
        if (!embedding_model || !vector_store) {
            console.log("Failed to initialize embedding model or vector store");
            return;
        }
        
        const embeddings = await this.create_embeddings_from_mongodb(embedding_model);
        
        if (embeddings) {
            await this.update_vector_table(vector_store.table, embeddings);
            return await this.vector_search(embedding_model, prompt, vector_store.table);
        } else {
            console.log("Failed to create embeddings, skipping vector search.");
        }

    }
}
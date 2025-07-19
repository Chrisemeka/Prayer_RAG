import { RagService } from '../service/rag';

async function setupEmbeddingsOnce() {
    console.log("Starting one-time embedding setup...");
    
    const rag = new RagService();
    const model = await rag.intialize_emebedding_model();
    const vectorStore = await rag.initialize_vector_store();
    
    if (!model || !vectorStore) {
        console.log("Failed to initialize components");
        return;
    }
    
    const existingCount = await vectorStore.table.countRows();
    
    if (existingCount > 0) {
        console.log(`Found ${existingCount} existing embeddings. Setup already complete!`);
        return;
    }
    
    // Continue with embedding creation...
    console.log("Creating embeddings...");
    const embeddings = await rag.create_embeddings_from_sqlite(model);
    
    if (embeddings) {
        await rag.update_vector_table(vectorStore.table, embeddings, true);
        console.log("Setup complete!");
    }
}

setupEmbeddingsOnce();

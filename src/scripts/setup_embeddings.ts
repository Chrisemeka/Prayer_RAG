import { RagService } from '../service/rag';

async function setupEmbeddingsOnce() {
    console.log("Starting one-time embedding setup...");
    
    const rag = new RagService();
    const model = await rag.intialize_emebedding_model();
    const verseVectorStore = await rag.initialize_verses_vector_store();
    const therapyVectorStore = await rag.initialize_therapy_vector_store();
    
    if (!model || !verseVectorStore || !therapyVectorStore) {
        console.log("Failed to initialize components");
        return;
    }
    
    const verseExistingCount = await verseVectorStore.table.countRows();
    const therapyExistingCount = await therapyVectorStore.table.countRows();
    
    if (verseExistingCount && therapyExistingCount > 0) {
        console.log(`Found existing embeddings. Setup already complete!`);
        return;
    }
    
    // Continue with embedding creation...
    console.log("Creating embeddings...");
    const verseEmbeddings = await rag.create_verse_embeddings_from_sqlite(model);
    const therapyEmbeddings = await rag.create_therapy_embeddings_from_sqlite(model);
    
    if (verseEmbeddings || therapyEmbeddings) {
        await rag.update_vector_table(verseVectorStore.table, verseEmbeddings, true);
        await rag.update_vector_table(therapyVectorStore.table, therapyEmbeddings, true);
        console.log("Setup complete!");
    }
}

setupEmbeddingsOnce();

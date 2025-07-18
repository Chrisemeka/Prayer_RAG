# Prayer RAG 🙏✨

*A Retrieval-Augmented Generation system that generates personalized biblical prayers using AI*

## What It Does

Prayer RAG takes your prayer requests and generates heartfelt, biblical prayers by:
1. **Understanding your request** using semantic search
2. **Finding relevant Bible verses** from a vector database of 31,000+ verses  
3. **Generating personalized prayers** that incorporate those scriptures

**Example:**
- **Input:** "I'm struggling with anxiety"
- **AI finds:** Philippians 4:6-7, Matthew 6:26, Psalm 23:4
- **Output:** A compassionate prayer addressing anxiety with biblical comfort

## Tech Stack (The JavaScript AI Revolution)

- **🧠 AI/ML:** HuggingFace Transformers.js, Groq LLM (Llama3-8b)
- **🔍 Vector Storage and Search:** LanceDB with sentence-transformers/all-MiniLM-L6-v2
- **💾 JSON Bible File Database:** MongoDB with Prisma ORM
- **🌐 Backend:** Node.js, Express, TypeScript
- **📦 Deployment:** Docker ready

## Architecture
![Logo](./images/WhatsApp%20Image%202025-07-07%20at%2022.33.02_2ca09f2a.jpg)

### The Flow
1. **Data Ingestion:** Bible verses → Chunking → MongoDB → Vector embeddings → LanceDB
2. **Prayer Generation:** User prompt → Semantic search → Relevant verses → AI prayer

## Key Code Snippets

### Creating Embeddings (Pure JavaScript!)
```typescript
async intialize_emebedding_model() {
    const model = new HuggingFaceTransformersEmbeddings({ 
        model: 'sentence-transformers/all-MiniLM-L6-v2' 
    });
    return model;
}
```

### Vector Search Magic
```typescript
async vector_search(model: any, query: string, table: any) {
    const query_vector = await model.embedQuery(query);
    const res = await table.search(query_vector).limit(5).toArray();
    return res.map(result => `${result.reference}: ${result.text}`);
}
```

### AI Prayer Generation
```typescript
const completion = await this.groq.chat.completions.create({
    messages: [
        { role: 'system', content: system_context },
        { role: 'user', content: user_prompt }
    ],
    model: 'llama3-8b-8192',
    temperature: 0.7
});
```

## Quick Start

### Prerequisites
- Node.js (v18+)
- MongoDB instance
- Groq API key

### Installation
```bash
# Clone the repo
git clone https://github.com/Chrisemeka/Prayer_RAG.git
cd Prayer_RAG

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your DATABASE_URL and GROQ_API_KEY

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

### Usage

1. **Ingest Bible Data**
```bash
GET /data/ingestion
```

2. **Generate Prayer**
```bash
POST /prayer/generate_prayer
Content-Type: application/json

{
  "prompt": "I need strength for a difficult day"
}
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/data/ingestion` | Load Bible data into database |
| POST | `/prayer/generate_prayer` | Generate prayer from prompt |

## Project Structure

```
src/
├── routes/
│   ├── data_ingestion.ts    # Bible data loading endpoints
│   ├── prayer_generator.ts  # Prayer generation API
│   └── rag.ts              # RAG pipeline endpoints
├── service/
│   ├── data_ingestion.ts   # Bible data processing
│   ├── inference.ts        # LLM integration
│   └── rag.ts             # Vector search & embeddings
├── generated/
│   └── prisma/            # Generated Prisma client
├── prisma.ts              # Database connection
└── index.ts               # Express server setup
```

## The Learning Journey

### Week 1 Challenges
- **Type Errors Galore:** TypeScript + AI libraries = fun debugging sessions
- **Model Selection:** Choosing between embedding models (ended up with all-MiniLM-L6-v2)
- **Vector DB Decision:** Tried multiple options before settling on LanceDB
- **LLM Integration:** Groq vs OpenAI vs local models

### What I Learned
- JavaScript IS viable for AI/ML applications
- RAG systems are incredibly powerful for domain-specific applications
- Vector databases are game-changers for semantic search
- The barrier to AI isn't language - it's mindset

## Contributing

This was my first AI project, so I'm sure there's room for improvement! PRs welcome.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Lessons for Fellow JavaScript Developers

Your existing skills are more transferable than you think. Sometimes the biggest barrier isn't technical - it's the story we tell ourselves about what's possible.

## Acknowledgments

- **My Mentor:** For the push into AI and belief in JavaScript's potential
- **HuggingFace:** For making transformers accessible in JavaScript
- **Groq:** For blazing-fast LLM inference
- **The JavaScript Community:** For proving that JS can do anything


*Built with ❤️ and a lot of coffee and no sleep ☕️

**Connect with me:** [LinkedIn](linkedin.com/in/chukwuemeka-anyanwu-14a4921a0) | **Star this repo** if it inspired you to build something cool!

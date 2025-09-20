const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://bambamcabs:G5uudg5Dpp4enKA3@bambamcabs.92sbclv.mongodb.net/?retryWrites=true&w=majority&appName=bambamcabs";

async function migrate() {
  const client = new MongoClient(uri);
  try {
    await client.connect();

    const testDb = client.db("test");          // old db
    const newDb = client.db("bambamcabs");     // new db

    const collections = await testDb.listCollections().toArray();

    for (let coll of collections) {
      const name = coll.name;
      console.log(`Migrating collection: ${name}`);

      const docs = await testDb.collection(name).find({}).toArray();

      if (docs.length > 0) {
        await newDb.collection(name).insertMany(docs);
        console.log(`✅ ${docs.length} documents copied to bambamcabs.${name}`);
      } else {
        console.log(`⚠️ ${name} is empty, skipped`);
      }
    }

    // drop old test db (optional)
    await testDb.dropDatabase();
    console.log("🚀 Migration completed. Old test DB dropped.");
  } catch (err) {
    console.error("❌ Error during migration:", err);
  } finally {
    await client.close();
  }
}

migrate();

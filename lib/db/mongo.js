import { MongoClient } from "mongodb";

let clientPromise;

function getClientPromise() {
  if (!clientPromise) {
    const client = new MongoClient(process.env.MONGODB_URI);
    clientPromise = client.connect();
  }
  return clientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB);
}

export async function getMetadataCollection() {
  const db = await getDb();
  return db.collection("package_metadata");
}

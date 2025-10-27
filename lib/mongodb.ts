import { MongoClient, Db } from 'mongodb'

const uri = process.env.MONGODB_URI!
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env.local')
}

client = new MongoClient(uri, options)
clientPromise = client.connect()

export default clientPromise

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  const client = await clientPromise
  const db = client.db() // Uses the database name from the connection string
  return { client, db }
}
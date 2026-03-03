import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is not set in environment variables');
const client = new MongoClient(uri);

async function checkSampleProject() {
  try {
    await client.connect();
    const db = client.db('68443081dcdfe43152aebf80');
    const projects = await db.collection('projects').find({}).limit(3).toArray();
    console.log('Sample projects:');
    projects.forEach((project, index) => {
      console.log(`Project ${index + 1}:`, {
        name: project.name,
        status: project.status,
        priority: project.priority,
        client: project.client,
        companyId: project.companyId
      });
    });

    // Check distinct values
    const distinctStatus = await db.collection('projects').distinct('status');
    const distinctPriority = await db.collection('projects').distinct('priority');
    const distinctClient = await db.collection('projects').distinct('client');

    console.log('Distinct values:');
    console.log('Status:', distinctStatus);
    console.log('Priority:', distinctPriority);
    console.log('Client:', distinctClient);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkSampleProject();

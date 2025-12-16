const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';

async function checkProjects() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('68443081dcdfe43152aebf80');
    const projects = await db.collection('projects').find({}).toArray();
    console.log('Projects collection - Total found:', projects.length);
    const allProjects = await db.collection('projects').find({}).toArray();
    console.log('ALL projects in database:', allProjects.length);

    if (allProjects.length > 0) {
      allProjects.slice(0, 3).forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name || 'No Name'} (ID: ${project._id}, Status: ${project.status}, CompanyId: ${project.companyId})`);
      });
    }
    const collections = await db.listCollections().toArray();
    console.log('Available collections:');
    collections.forEach(col => console.log(`  - ${col.name}`));

    const employees = await db.collection('employees').countDocuments();
    const clients = await db.collection('clients').countDocuments();
    console.log('Employees count:', employees);
    console.log('Clients count:', clients);

    await client.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkProjects();

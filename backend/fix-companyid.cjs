const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';

async function fixCompanyId() {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db('68443081dcdfe43152aebf80');
    const fixedProjects = await db.collection('projects').find({ companyId: '68443081dcdfe43152aebf80' }).toArray();
    console.log('📋 Projects with correct companyId:', fixedProjects.length);

    if (fixedProjects.length > 0) {
      console.log('📊 Sample fixed projects:');
      fixedProjects.slice(0, 3).forEach((project, index) => {
        console.log(`  ${index + 1}. ${project.name} (Status: ${project.status}, CompanyId: ${project.companyId})`);
      });
    }

    await client.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

fixCompanyId();

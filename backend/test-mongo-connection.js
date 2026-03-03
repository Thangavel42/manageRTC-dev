import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

console.log('Testing MongoDB Connection...');
console.log('Connection String:', uri ? uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') : 'NOT SET');

async function testConnection() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    console.log('\n1. Attempting to connect...');
    await client.connect();
    console.log('✅ Connection successful!');

    console.log('\n2. Testing database access...');
    const db = client.db(process.env.MONGODB_DATABASE || 'AmasQIS');
    const collections = await db.listCollections().toArray();
    console.log('✅ Database accessible!');
    console.log(`   Database: ${db.databaseName}`);
    console.log(`   Collections found: ${collections.length}`);

    console.log('\n3. Testing ping...');
    const adminDb = client.db('admin');
    const pingResult = await adminDb.command({ ping: 1 });
    console.log('✅ Ping successful!', pingResult);

    console.log('\n✅ All tests passed! MongoDB connection is working.');
  } catch (error) {
    console.error('\n❌ Connection failed!');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);

    console.log('\n🔍 Troubleshooting Tips:');

    if (error.code === 'ECONNREFUSED' || error.message.includes('querySrv')) {
      console.log('\n1. CHECK MONGODB ATLAS CLUSTER STATUS:');
      console.log('   • Go to https://cloud.mongodb.com/');
      console.log('   • Check if your cluster is PAUSED (common in free tier)');
      console.log('   • If paused, click "Resume" button');

      console.log('\n2. CHECK IP WHITELIST:');
      console.log('   • Go to Security → Network Access in MongoDB Atlas');
      console.log('   • Add your current IP or use 0.0.0.0/0 (allow all) for testing');

      console.log('\n3. CHECK DNS/NETWORK:');
      console.log('   • Try pinging: managertc-acc-cluster.mffqa03.mongodb.net');
      console.log('   • Check if firewall/antivirus is blocking MongoDB ports');
      console.log('   • Try disabling VPN if connected');
    } else if (error.message.includes('authentication')) {
      console.log('\n• CHECK CREDENTIALS:');
      console.log('   • Verify username and password in MongoDB Atlas');
      console.log('   • Ensure special characters in password are URL-encoded');
    }

    process.exit(1);
  } finally {
    await client.close();
  }
}

testConnection();

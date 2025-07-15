#!/usr/bin/env node

// Test primary API list timing
import axios from 'axios';

async function testPrimary() {
  console.log('Testing primary API list.json timing...\n');
  
  try {
    console.time('primary-list');
    const response = await axios.get('https://api.apis.guru/v2/list.json', {
      timeout: 120000
    });
    console.timeEnd('primary-list');
    
    const apis = Object.keys(response.data);
    console.log(`✅ Got ${apis.length} APIs`);
    console.log(`Response size: ${JSON.stringify(response.data).length} bytes`);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

testPrimary();
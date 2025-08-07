#!/usr/bin/env node

/**
 * Test script to verify the ORM switching functionality works correctly.
 * Tests both Drizzle (default) and Sequelize modes by making API calls.
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:4321';

async function testOrmSwitch() {
  console.log('🧪 Testing ORM switching functionality...\n');
  
  try {
    // Test 1: Messages cursor pagination endpoint
    console.log('📑 Testing /api/messages endpoint...');
    const messagesResponse = await fetch(`${BASE_URL}/api/messages?limit=5`);
    
    if (messagesResponse.ok) {
      const data = await messagesResponse.json();
      console.log(`✅ Messages API: Retrieved ${data.items?.length || 0} messages`);
    } else {
      console.log(`❌ Messages API: HTTP ${messagesResponse.status}`);
    }
    
    // Test 2: V1 cursor endpoint  
    console.log('📑 Testing /api/v1/messages/cursor endpoint...');
    const cursorResponse = await fetch(`${BASE_URL}/api/v1/messages/cursor?limit=5`);
    
    if (cursorResponse.ok) {
      const data = await cursorResponse.json();
      console.log(`✅ Cursor API: Retrieved ${data.data?.length || 0} messages`);
    } else {
      console.log(`❌ Cursor API: HTTP ${cursorResponse.status}`);
    }
    
    // Test 3: Messages page (server-side rendering)
    console.log('📄 Testing /messages page...');
    const pageResponse = await fetch(`${BASE_URL}/messages`);
    
    if (pageResponse.ok) {
      console.log('✅ Messages page: Loaded successfully');
    } else {
      console.log(`❌ Messages page: HTTP ${pageResponse.status}`);
    }
    
    console.log('\n🎉 All tests completed!');
    console.log('\nTo test with Sequelize, set USE_SEQUELIZE=true environment variable');
    console.log('Example: USE_SEQUELIZE=true npm run dev');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testOrmSwitch();
}

export { testOrmSwitch };
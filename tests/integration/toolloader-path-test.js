#!/usr/bin/env node
/**
 * Test that ToolLoader works from different directories
 */
import { ToolHandler } from '../../dist/tools/handler.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFromDirectory(testName, changeDir) {
  const originalCwd = process.cwd();
  
  try {
    // Change to test directory
    if (changeDir) {
      process.chdir(changeDir);
    }
    
    console.log(`\nTesting from: ${testName}`);
    console.log(`Current directory: ${process.cwd()}`);
    
    const handler = new ToolHandler();
    const { tools } = await handler.listTools();
    
    console.log(`✅ Successfully loaded ${tools.length} tools`);
    
    // Verify we have all 22 tools
    if (tools.length !== 22) {
      throw new Error(`Expected 22 tools, but got ${tools.length}`);
    }
    
    // Verify cache tools are present
    const cacheTools = tools.filter(t => 
      t.name === 'cache_info' || 
      t.name === 'cache_stats' || 
      t.name === 'clear_cache' || 
      t.name === 'clear_cache_key' || 
      t.name === 'list_cache_keys'
    );
    
    if (cacheTools.length !== 5) {
      console.log(`Cache tools found: ${cacheTools.map(t => t.name).join(', ')}`);
      console.log(`All tools: ${tools.map(t => t.name).join(', ')}`);
      throw new Error(`Expected 5 cache tools, but got ${cacheTools.length}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return false;
  } finally {
    process.chdir(originalCwd);
  }
}

async function runTests() {
  console.log('Testing ToolLoader path resolution from different directories...');
  
  const projectRoot = path.resolve(__dirname, '../..');
  const tests = [
    { name: 'Project root', dir: projectRoot },
    { name: 'Tests directory', dir: path.join(projectRoot, 'tests') },
    { name: 'Home directory', dir: process.env.HOME || process.env.USERPROFILE },
    { name: 'Temp directory', dir: '/tmp' },
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    const passed = await testFromDirectory(test.name, test.dir);
    if (!passed) {
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All path resolution tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some path resolution tests failed');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
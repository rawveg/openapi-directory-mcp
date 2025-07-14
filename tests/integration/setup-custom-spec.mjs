#!/usr/bin/env node
/**
 * Setup script to create a test custom spec for triple-source testing
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { ManifestManager } from '../../dist/custom-specs/manifest-manager.js';

async function setupCustomSpec() {
  console.log('🔧 Setting up test custom spec...');
  
  const manifestManager = new ManifestManager();
  
  // Read the test spec
  const specPath = join(process.cwd(), 'tests/fixtures/test-custom-spec.json');
  const specContent = readFileSync(specPath, 'utf-8');
  
  // DEBUG: Log what we're trying to validate
  console.log('🔍 DEBUG: Raw file content structure...');
  const parsedContent = JSON.parse(specContent);
  console.log('🔍 Root level keys:', Object.keys(parsedContent));
  console.log('🔍 Has openapi field at root:', !!parsedContent.openapi);
  console.log('🔍 Has swagger field at root:', !!parsedContent.swagger);
  console.log('🔍 Has versions field:', !!parsedContent.versions);
  if (parsedContent.versions && parsedContent.versions['1.0.0']) {
    console.log('🔍 Has spec in versions[1.0.0]:', !!parsedContent.versions['1.0.0'].spec);
    if (parsedContent.versions['1.0.0'].spec) {
      console.log('🔍 Spec has openapi field:', !!parsedContent.versions['1.0.0'].spec.openapi);
    }
  }
  
  const specName = 'testapi';
  const specVersion = '1.0.0';
  const specId = `custom:${specName}:${specVersion}`;
  
  // Check if already exists
  if (manifestManager.hasSpec(specId)) {
    console.log(`✅ Custom spec ${specId} already exists`);
    return;
  }
  
  // Store the spec file
  const specFilePath = manifestManager.storeSpecFile(specName, specVersion, specContent);
  console.log(`📁 Stored spec file: ${specFilePath}`);
  
  // Add to manifest
  const specEntry = {
    id: specId,
    name: specName,
    version: specVersion,
    title: 'Test API',
    description: 'A test API for comprehensive testing',
    imported: new Date().toISOString(),
    sourceType: 'file',
    originalFormat: 'json',
    fileSize: Buffer.byteLength(specContent, 'utf-8')
  };
  
  manifestManager.addSpec(specEntry);
  console.log(`✅ Added custom spec to manifest: ${specId}`);
  
  // Verify
  const specs = manifestManager.listSpecs();
  console.log(`📊 Total custom specs: ${specs.length}`);
  
  return specId;
}

setupCustomSpec()
  .then(specId => {
    console.log('✅ Custom spec setup completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Failed to setup custom spec:', error);
    process.exit(1);
  });
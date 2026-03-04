/**
 * Validation Audit Script
 * Scans all route files to identify endpoints without input validation
 *
 * SECURITY AUDIT - Phase 3, Task 3.1
 * Created: 2026-03-02
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTES_DIR = path.join(__dirname, '../routes/api');

// Validation middleware patterns to look for
const VALIDATION_PATTERNS = {
  body: /validateBody\s*\(/,
  query: /validateQuery\s*\(/,
  params: /validateParams\s*\(/,
  joiValidate: /\.validate\s*\(/,
  joiSchema: /Joi\./,
};

// HTTP methods to check
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

/**
 * Parse route file content to extract route definitions
 */
function parseRouteFile(filePath, content) {
  const routes = [];
  const fileName = path.basename(filePath);

  // Check if file imports validation middleware
  const hasValidationImport = content.includes('validateBody') ||
                                content.includes('validateQuery') ||
                                content.includes('validateParams') ||
                                content.includes('Joi');

  // Extract all route definitions
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    HTTP_METHODS.forEach(method => {
      // Match router.method('/path', middleware, handler)
      const routeRegex = new RegExp(`router\\.${method}\\s*\\(\\s*['"\`]([^'"\`]+)['"\`]`, 'i');
      const match = line.match(routeRegex);

      if (match) {
        const routePath = match[1];
        const fullLine = line.trim();

        // Check if this specific route has validation
        const hasValidation = Object.values(VALIDATION_PATTERNS).some(pattern =>
          fullLine.match(pattern)
        );

        // Check surrounding lines (middleware might be on previous line)
        const contextStart = Math.max(0, index - 2);
        const contextEnd = Math.min(lines.length, index + 3);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        const hasContextValidation = Object.values(VALIDATION_PATTERNS).some(pattern =>
          context.match(pattern)
        );

        routes.push({
          file: fileName,
          method: method.toUpperCase(),
          path: routePath,
          line: index + 1,
          hasValidation: hasValidation || hasContextValidation,
          snippet: fullLine.substring(0, 100)
        });
      }
    });
  });

  return { routes, hasValidationImport };
}

/**
 * Scan all route files
 */
function scanRoutes() {
  const files = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.js'));

  const results = {
    totalFiles: files.length,
    totalRoutes: 0,
    validatedRoutes: 0,
    unvalidatedRoutes: 0,
    fileStats: [],
    unvalidatedEndpoints: []
  };

  files.forEach(file => {
    const filePath = path.join(ROUTES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    const { routes, hasValidationImport } = parseRouteFile(filePath, content);

    const validated = routes.filter(r => r.hasValidation).length;
    const unvalidated = routes.filter(r => !r.hasValidation).length;

    results.totalRoutes += routes.length;
    results.validatedRoutes += validated;
    results.unvalidatedRoutes += unvalidated;

    results.fileStats.push({
      file,
      totalRoutes: routes.length,
      validated,
      unvalidated,
      hasValidationImport,
      coverage: routes.length > 0 ? Math.round((validated / routes.length) * 100) : 0
    });

    // Collect unvalidated endpoints
    routes.filter(r => !r.hasValidation).forEach(route => {
      results.unvalidatedEndpoints.push(route);
    });
  });

  return results;
}

/**
 * Generate audit report
 */
function generateReport(results) {
  console.log('\n' + '='.repeat(80));
  console.log('VALIDATION AUDIT REPORT - Phase 3, Task 3.1');
  console.log('Generated:', new Date().toISOString());
  console.log('='.repeat(80) + '\n');

  // Overall statistics
  console.log('📊 OVERALL STATISTICS');
  console.log('-'.repeat(80));
  console.log(`Total Route Files:       ${results.totalFiles}`);
  console.log(`Total Routes:            ${results.totalRoutes}`);
  console.log(`Validated Routes:        ${results.validatedRoutes} (${Math.round((results.validatedRoutes / results.totalRoutes) * 100)}%)`);
  console.log(`Unvalidated Routes:      ${results.unvalidatedRoutes} (${Math.round((results.unvalidatedRoutes / results.totalRoutes) * 100)}%)`);
  console.log('\n');

  // Files with lowest coverage
  console.log('⚠️  FILES WITH LOWEST VALIDATION COVERAGE');
  console.log('-'.repeat(80));

  const sortedFiles = [...results.fileStats]
    .filter(f => f.totalRoutes > 0)
    .sort((a, b) => a.coverage - b.coverage)
    .slice(0, 10);

  sortedFiles.forEach((file, index) => {
    const status = file.coverage === 0 ? '❌' : file.coverage < 50 ? '⚠️' : '⚡';
    console.log(`${index + 1}. ${status} ${file.file}`);
    console.log(`   Coverage: ${file.coverage}% (${file.validated}/${file.totalRoutes} routes)`);
    console.log(`   Validation Import: ${file.hasValidationImport ? '✅ Yes' : '❌ No'}`);
  });
  console.log('\n');

  // Critical unvalidated routes (POST, PUT, PATCH, DELETE)
  const criticalRoutes = results.unvalidatedEndpoints.filter(r =>
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method)
  );

  if (criticalRoutes.length > 0) {
    console.log('🚨 CRITICAL: UNVALIDATED WRITE OPERATIONS');
    console.log('-'.repeat(80));
    console.log(`Found ${criticalRoutes.length} write operations without validation:\n`);

    // Group by file
    const byFile = criticalRoutes.reduce((acc, route) => {
      if (!acc[route.file]) acc[route.file] = [];
      acc[route.file].push(route);
      return acc;
    }, {});

    Object.entries(byFile).forEach(([file, routes]) => {
      console.log(`📁 ${file}`);
      routes.forEach(route => {
        console.log(`   ${route.method.padEnd(6)} ${route.path} (line ${route.line})`);
      });
      console.log('');
    });
  }

  // All unvalidated GET routes
  const getRoutes = results.unvalidatedEndpoints.filter(r => r.method === 'GET');

  if (getRoutes.length > 0) {
    console.log('ℹ️  UNVALIDATED GET ROUTES (Query Parameters)');
    console.log('-'.repeat(80));
    console.log(`Found ${getRoutes.length} GET routes without query validation:\n`);

    // Group by file
    const byFile = getRoutes.reduce((acc, route) => {
      if (!acc[route.file]) acc[route.file] = [];
      acc[route.file].push(route);
      return acc;
    }, {});

    Object.entries(byFile).slice(0, 5).forEach(([file, routes]) => {
      console.log(`📁 ${file}`);
      routes.slice(0, 5).forEach(route => {
        console.log(`   GET ${route.path} (line ${route.line})`);
      });
      if (routes.length > 5) {
        console.log(`   ... and ${routes.length - 5} more`);
      }
      console.log('');
    });
  }

  // Summary and recommendations
  console.log('\n' + '='.repeat(80));
  console.log('📋 RECOMMENDATIONS');
  console.log('='.repeat(80));

  if (results.unvalidatedRoutes === 0) {
    console.log('✅ All routes have validation! Great job!');
  } else {
    console.log('\n1. PRIORITY: Validate all POST, PUT, PATCH, DELETE routes');
    console.log('   - These routes modify data and MUST have input validation');
    console.log(`   - Found ${criticalRoutes.length} critical routes without validation\n`);

    console.log('2. Add query parameter validation to GET routes');
    console.log('   - Validate pagination params (page, limit)');
    console.log('   - Validate ObjectId formats');
    console.log('   - Validate date ranges and search terms\n');

    console.log('3. Create Joi schemas for common patterns');
    console.log('   - Pagination schema');
    console.log('   - ObjectId schema');
    console.log('   - Date range schema');
    console.log('   - Search term schema\n');

    console.log('4. Files requiring immediate attention:');
    const needsAttention = sortedFiles.filter(f => f.coverage < 50).slice(0, 5);
    needsAttention.forEach(file => {
      console.log(`   - ${file.file} (${file.coverage}% coverage)`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Save detailed report to file
  const reportPath = path.join(__dirname, '../reports/validation-audit.json');
  const reportDir = path.dirname(reportPath);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

/**
 * Main execution
 */
function main() {
  try {
    console.log('\n🔍 Starting validation audit...\n');

    const results = scanRoutes();
    generateReport(results);

    // Exit with error code if critical routes are unvalidated
    const criticalUnvalidated = results.unvalidatedEndpoints.filter(r =>
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method)
    ).length;

    if (criticalUnvalidated > 0) {
      console.log(`⚠️  Warning: ${criticalUnvalidated} critical routes without validation`);
      process.exit(1);
    } else {
      console.log('✅ All critical routes have validation');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

main();

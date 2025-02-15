const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database configuration
const dbConfig = {
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME
};

let outputContent = '';

// Function to scan directory for script files
async function scanDirectory(dir) {
	try {
		const files = await fs.readdir(dir);
		
		for (const file of files) {
			const filePath = path.join(dir, file);
			const stat = await fs.stat(filePath);

			// Skip node_modules directory
			if (file === 'node_modules') continue;
			if (file.startsWith('cloudflare')) continue;
			if (file.startsWith('data.txt')) continue;
			if (file.startsWith('project_info.txt')) continue;
			if (file.startsWith('scan.js')) continue;

			if (stat.isDirectory()) {
				await scanDirectory(filePath);
			} else if (file.endsWith('.js') || file.endsWith('.ts')|| file.endsWith('.html') || file.endsWith('.css')) {
				const content = await fs.readFile(filePath, 'utf8');
				
				outputContent += '\n----------\n';
				outputContent += '----------\n';
				outputContent += path.relative(process.cwd(), filePath) + '\n';
				outputContent += '------------\n';
				outputContent += content + '\n';
				outputContent += '-----------\n\n';
			}
		}
	} catch (err) {
		console.error('Error scanning directory:', err);
	}
}

// Function to get database schema and data
async function getDatabaseInfo() {
	try {
		const connection = await mysql.createConnection(dbConfig);

		// Get all tables
		const [tables] = await connection.query('SHOW TABLES');
		
		outputContent += '\n=== DATABASE SCHEMA AND DATA ===\n\n';

		for (const tableRow of tables) {
			const tableName = tableRow[Object.keys(tableRow)[0]];
			
			// Get table schema
			const [schema] = await connection.query(`DESCRIBE ${tableName}`);
			outputContent += `Table: ${tableName}\n`;
			outputContent += 'Schema:\n';
			outputContent += JSON.stringify(schema, null, 2) + '\n\n';

			// Get table data
			const [rows] = await connection.query(`SELECT * FROM ${tableName}`);
			outputContent += 'Data:\n';
			outputContent += JSON.stringify(rows, null, 2) + '\n\n';
		}

		await connection.end();
	} catch (err) {
		console.error('Error getting database info:', err);
		outputContent += `Database Error: ${err.message}\n`;
	}
}

// Main function
async function main() {
	// Scan for script files
	await scanDirectory(process.cwd());
	
	// Get database information
	await getDatabaseInfo();

	// Save to file
	try {
		await fs.writeFile('project_info.txt', outputContent);
		console.log('Information saved to project_info.txt');
	} catch (err) {
		console.error('Error saving file:', err);
	}
}

// Run the script
main().catch(console.error);

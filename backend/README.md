# Excel to App - Backend Server

A standalone Node.js + Express backend server for the Excel to App project.

## Features

- **SQLite Database** - Hierarchical structure: Projects → Excel Files → Entries → AI Responses
- **REST API** - Full CRUD operations for all entities
- **File Upload** - Excel file upload with automatic entry creation
- **CORS Enabled** - Configured for frontend communication
- **Request Validation** - Express-validator for data validation
- **Error Handling** - Centralized error handling middleware

## Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

## Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
NODE_ENV=development
DB_PATH=./data/app.sqlite
UPLOAD_DIR=./data/uploads
CORS_ORIGIN=http://localhost:3000
MAX_FILE_SIZE=10485760
```

## Running the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Projects

```
GET    /api/projects           - List all projects
POST   /api/projects           - Create a project
GET    /api/projects/:id       - Get project by ID
PUT    /api/projects/:id       - Update project
DELETE /api/projects/:id       - Delete project (cascades)
```

### Excel Files

```
GET    /api/projects/:id/files - List files in project
POST   /api/projects/:id/files - Upload Excel file
GET    /api/files/:id          - Get file details
DELETE /api/files/:id          - Delete file (cascades)
GET    /api/files/:id/entries  - List entries in file
```

### Entries

```
GET    /api/entries/:id        - Get entry by ID
DELETE /api/entries/:id        - Delete entry (cascades)
```

### AI Responses

```
GET    /api/entries/:id/responses - List AI responses for entry
POST   /api/entries/:id/responses - Create AI response
GET    /api/responses/:id         - Get response by ID
PUT    /api/responses/:id         - Update response
DELETE /api/responses/:id         - Delete response
```

### Health Check

```
GET    /health                 - Server health status
```

## API Usage Examples

### Create a Project

```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Sales Data","description":"Q1 2024"}'
```

### Upload Excel File

```bash
curl -X POST http://localhost:5000/api/projects/1/files \
  -F "file=@data.xlsx"
```

### Create AI Response

```bash
curl -X POST http://localhost:5000/api/entries/1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate summary",
    "response": "AI generated response...",
    "model": "gemini-2.0-flash"
  }'
```

## Database Schema

```
projects
├── id (PK)
├── name
├── description
├── created_at
└── updated_at

excel_files
├── id (PK)
├── project_id (FK → projects)
├── file_name
├── file_path
├── columns (JSON)
└── uploaded_at

entries
├── id (PK)
├── excel_file_id (FK → excel_files)
├── row_number
├── data (JSON)
└── created_at

ai_responses
├── id (PK)
├── entry_id (FK → entries)
├── prompt
├── response
├── model
├── created_at
└── updated_at
```

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── project.model.js
│   │   ├── file.model.js
│   │   ├── entry.model.js
│   │   └── response.model.js
│   ├── routes/
│   │   ├── project.routes.js
│   │   ├── file.routes.js
│   │   ├── entry.routes.js
│   │   └── response.routes.js
│   ├── middleware/
│   │   ├── error.middleware.js
│   │   └── upload.middleware.js
│   ├── utils/
│   │   ├── excel-parser.js
│   │   └── file-storage.js
│   └── server.js
├── data/              # SQLite DB and uploads (auto-created)
├── package.json
└── .env
```

## Error Handling

All errors are returned in JSON format:

```json
{
  "error": "Error message"
}
```

HTTP Status Codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

## Development

The server uses `nodemon` for development, which automatically restarts when files change.

## License

MIT

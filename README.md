
# Web-Messanger-App

**Description:**  
This is a web-based messaging application built with React for the frontend and FastAPI for the backend.

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/SuslikSenya/Web-Messanger-App.git
cd Web-Messanger-App
```

### 2. Install dependencies

#### Frontend (React):

```bash
cd frontend
npm install
```

#### Backend (Python):

```bash
cd backend
pip install -r requirements.txt
```

### 3. Run the application

#### Frontend:

```bash
cd frontend
npm start
```

#### Backend:

```bash
cd backend/src
uvicorn main:app --reload
```

The application will be available at `http://localhost:3000` for the frontend and `http://localhost:8000` for the backend.

## Run with Docker

### 1. Build and start containers

```bash
docker-compose up --build
```

This will build the frontend and backend images and start the app.

### 2. Access the application

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### 3. Stop containers

```bash
docker-compose down
```

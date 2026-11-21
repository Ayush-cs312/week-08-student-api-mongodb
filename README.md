# Student Management REST API (MongoDB + Mongoose)

A REST API built with **Node.js**, **Express.js** and **MongoDB (Mongoose)** to manage student records.
This is the Week 08 upgrade of the Week 07 in-memory API: data is now stored permanently in a MongoDB collection.

## Live Demo

- **Base URL:** https://student-management-mongodb-b9lz.onrender.com/
- **All students:** https://student-management-mongodb-b9lz.onrender.com/students

> The API is hosted on Render's free plan, so it sleeps when idle. The first request can take about 30 seconds to respond.

## Features

- Full CRUD for students, stored in MongoDB through Mongoose
- Schema validation (required fields, text length, semester 1 to 8 as a whole number)
- Search by department: `GET /students?department=computer`
- Automatic `createdAt` and `updatedAt` timestamps
- Database connection errors handled: clear startup messages, and `503` if the database goes away while running
- Proper status codes: 200, 201, 400, 404, 503

## Tech Stack

Node.js, Express.js, MongoDB Atlas, Mongoose, dotenv, deployed on Render.

## Requirements

- [Node.js](https://nodejs.org) 18 or newer
- A MongoDB database: a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster, or MongoDB installed locally

## Setup

1. Clone the repo and install packages:
   ```bash
   git clone <your-repo-url>
   cd <your-repo-folder>
   npm install
   ```
2. Create your environment file by copying the example, then fill in your connection string:
   ```bash
   cp .env.example .env        # on Windows: copy .env.example .env
   ```
   ```
   PORT=3000
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/studentdb?retryWrites=true&w=majority
   ```
   For a local MongoDB use `MONGODB_URI=mongodb://127.0.0.1:27017/studentdb`.
3. Start the server:
   ```bash
   npm start
   ```
   You should see `Connected to MongoDB` and `Server running at http://localhost:3000`.
   For auto-restart while editing use `npm run dev`.

> **Never upload your real `.env` file.** It holds your database password. It is listed in `.gitignore`; only `.env.example` goes to GitHub.

### Getting an Atlas connection string (free)

1. Create a free account and an **M0** cluster at mongodb.com/cloud/atlas.
2. **Database Access:** add a database user with a username and password.
3. **Network Access:** add `0.0.0.0/0` (allow access from anywhere) so your computer and Render can connect.
4. Click **Connect > Drivers**, copy the connection string, replace `<password>`, and add a database name such as `studentdb` before the `?`.

## Project Structure

```
server.js            Express app, DB connection, middleware, error handling
models/Student.js    Mongoose schema and model (validation, timestamps)
routes/students.js   CRUD routes
test.js              Automated tests (npm test)
.env.example         Template for environment variables
```

## API Endpoints

| Method | Endpoint                        | Description                          | Success | Errors        |
|--------|---------------------------------|--------------------------------------|---------|---------------|
| GET    | `/students`                     | Get all students (newest first)      | 200     | 503           |
| GET    | `/students?department=computer` | Search students by department        | 200     | 503           |
| GET    | `/students/:id`                 | Get one student                      | 200     | 400, 404, 503 |
| POST   | `/students`                     | Add a student                        | 201     | 400, 503      |
| PUT    | `/students/:id`                 | Update a student (any of the fields) | 200     | 400, 404, 503 |
| DELETE | `/students/:id`                 | Delete a student                     | 200     | 400, 404, 503 |

A student looks like this. The `id` is created by MongoDB, and the timestamps are added automatically:

```json
{
  "id": "6650f1c2a1b2c3d4e5f60718",
  "name": "Aarav Shetty",
  "department": "Computer Science",
  "semester": 4,
  "createdAt": "2026-11-18T10:00:00.000Z",
  "updatedAt": "2026-11-18T10:00:00.000Z"
}
```

### Validation Rules (Mongoose schema)

- `name`: required, 2 to 60 characters (extra spaces are trimmed)
- `department`: required, 2 to 60 characters
- `semester`: required, a whole number from 1 to 8
- `PUT` accepts any of these fields, but at least one, and each field sent must be valid

Errors come back as JSON:

```json
{ "error": "Validation failed", "details": ["semester must be between 1 and 8"] }
```

## Testing with Postman or Thunder Client

Use `http://localhost:3000` locally, or the live URL above. For POST and PUT set **Body > raw > JSON**.
The database starts empty, so add a student first and copy the `id` from the response for the other requests.

| # | Request                                    | Body                                                         | Expected                                |
|---|--------------------------------------------|--------------------------------------------------------------|-----------------------------------------|
| 1 | `POST /students`                           | `{"name":"Meera","department":"Mechanical","semester":2}`    | 201, new student with id and timestamps |
| 2 | `GET /students`                            | none                                                         | 200, list of students                   |
| 3 | `GET /students/<id>`                       | none                                                         | 200, one student                        |
| 4 | `GET /students?department=mech`            | none                                                         | 200, only matching students             |
| 5 | `PUT /students/<id>`                       | `{"semester":5}`                                             | 200, updated student (new `updatedAt`)  |
| 6 | `DELETE /students/<id>`                    | none                                                         | 200, "Student deleted"                  |
| 7 | `GET /students/<id>` (after delete)        | none                                                         | 404, not found                          |
| 8 | `GET /students/abc`                        | none                                                         | 400, invalid id                         |
| 9 | `POST /students`                           | `{"name":"","semester":12}`                                  | 400, validation errors                  |

### Automated Tests

```bash
npm test
```

Runs 9 tests covering every endpoint, validation, search, timestamps and the database-down case.
They use a temporary in-memory MongoDB (downloaded automatically on the first run, so you need internet)
and never touch your real database.

## Deployment (Render)

GitHub Pages cannot run a Node server, so this project is deployed on [Render](https://render.com) (free plan):

1. Push this project to GitHub (without `.env`).
2. On Render choose **New > Web Service** and select the repo.
3. Set **Build Command** to `npm install` and **Start Command** to `npm start`.
4. Under **Environment**, add the variable `MONGODB_URI` with your Atlas connection string.
5. Deploy, then open `https://<your-service>.onrender.com/students`.

## Author

Ayush Kumar

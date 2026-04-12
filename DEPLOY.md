# Deployment Guide

## Frontend (Vercel)

1.  **Create a new project** on Vercel.
2.  **Import** your Git repository.
3.  **Configure Project**:
    *   **Root Directory**: Edit this and select `frontend`.
    *   **Framework Preset**: Vite.
    *   **Build Command**: `npm run build` (default).
    *   **Output Directory**: `dist` (default).
    *   **Install Command**: `npm install` (default).
4.  **Environment Variables**:
    *   `VITE_API_BASE_URL`: The URL of your deployed backend (e.g., `https://your-app-backend.onrender.com`).
        *   *Note: You can deploy the backend first to get this URL, or deploy frontend first, then update this variable and redeploy.*

## Backend (Render)
//TODO: Add Render deployment instructions
1.  **Create a new Web Service** on Render.
2.  **Connect** your Git repository.
3.  **Configure Service**:
    *   **Root Directory**: `backend`.
    *   **Runtime**: Node.
    *   **Build Command**: `npm install`.
    *   **Start Command**: `npm start`.
4.  **Environment Variables**:
    *   `NODE_ENV`: `production`
    *   `CORS_ORIGIN`: The URL of your deployed frontend (e.g., `https://your-app-frontend.vercel.app`).
    *   `MONGO_URI`: Your MongoDB connection string (e.g., from MongoDB Atlas).
    *   `JWT_SECRET`: A strong random string for security.
    *   `ZEGO_APP_ID`: Your Zego Cloud App ID (if using Zego).
    *   `ZEGO_SERVER_SECRET`: Your Zego Cloud Server Secret (if using Zego).
    *   `PORT`: `10000` (Render usually sets this automatically, but good to be aware).

## Important Notes

*   **MongoDB**: Ensure your MongoDB cluster allows access from anywhere (`0.0.0.0/0`) or configure it to allow Render's IP addresses.
*   **CORS**: If you get CORS errors, double-check that `CORS_ORIGIN` on the backend exactly matches your frontend URL (no trailing slash usually).

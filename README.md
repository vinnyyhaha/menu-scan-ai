# MenuScan AI - Professional Deployment Guide

This project is a professional, AI-powered menu extraction tool built with React, Vite, and the Gemini API.

## 🚀 Deployment to Vercel

Follow these steps to host your own version of MenuScan AI:

### 1. Export the Code
*   In AI Studio Build, go to **Settings** > **Export to GitHub**.
*   Follow the prompts to create a new repository on your GitHub account.

### 2. Set up Vercel
*   Go to [Vercel](https://vercel.com) and log in with GitHub.
*   Click **"Add New"** > **"Project"**.
*   Import your `menuscan-ai` repository.

### 3. Configure Environment Variables
Before clicking **Deploy**, you must add your Gemini API Key:
1.  Open the **Environment Variables** section.
2.  Add a new variable:
    *   **Key**: `GEMINI_API_KEY`
    *   **Value**: `YOUR_GEMINI_API_KEY_HERE`
    *   *(Get your key from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey))*
3.  Click **Add**.

### 4. Deploy
*   Click **Deploy**. Vercel will build the app and provide you with a public URL.

## 🛠 Tech Stack
*   **Frontend**: React 19 + Vite
*   **Styling**: Tailwind CSS 4
*   **AI Engine**: Google Gemini 3 Flash
*   **Data Export**: XLSX (Excel)
*   **Animations**: Framer Motion

## 🔒 Security Note
The Gemini API key is injected at build time. For a high-traffic production environment, it is recommended to move the AI extraction logic to a Vercel Serverless Function (located in an `/api` directory) to keep the key strictly server-side.

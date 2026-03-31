import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const allowedOrigins = [
  'http://localhost:5173',
  'https://merkahorro.com',
  'https://www.merkahorro.com',
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS no permitido'), false);
    }
    return callback(null, true);
  },
  
  credentials: true, 
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Cache-Control",
    "Pragma",
  ],
};

export const corsMiddleware = cors(corsOptions);
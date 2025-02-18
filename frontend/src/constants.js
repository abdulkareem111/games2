// src/constants.js

// Change BASE_URL to your actual backend URL, e.g. a domain or localhost:port
export const BASE_URL = process.env.REACT_APP_API_BASE_URL 
  ? process.env.REACT_APP_API_BASE_URL.replace('/api','')
  : "http://198.199.83.48:2053";

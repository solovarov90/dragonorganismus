import axios from 'axios';

// In development with 'netlify dev', functions are at /.netlify/functions
const API_BASE = '/.netlify/functions';

export const api = axios.create({
    baseURL: API_BASE
});

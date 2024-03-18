import { config } from 'dotenv';

config();

export const API_KEY_OPENSUBTITLES = process.env.API_KEY_OPENSUBTITLES || '';

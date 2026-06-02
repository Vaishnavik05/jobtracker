import axios from 'axios';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  'https://job-portal-latest-ccvz.onrender.com';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

function formatAxiosError(err) {
  if (!err) return 'Unknown error';
  if (err.response && err.response.data) {
    const d = err.response.data;
    return d.message || (typeof d === 'string' ? d : JSON.stringify(d));
  }
  return err.message || String(err);
}

export async function registerUser(payload) {
  try {
    const res = await client.post('/api/auth/register', payload);
    return res.data;
  } catch (err) {
    throw new Error(formatAxiosError(err));
  }
}

export async function loginUser(payload) {
  try {
    const res = await client.post('/api/auth/login', payload);
    return res.data;
  } catch (err) {
    throw new Error(formatAxiosError(err));
  }
}

export default client;
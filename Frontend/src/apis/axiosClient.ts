// import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// const axiosClient: AxiosInstance = axios.create({
//     baseURL: `http://192.168.68.143:5000/api/v1`,
//     headers: {
//         "Content-Type" : "application/json"
//     }
// });

// axiosClient.interceptors.request.use(async (request: InternalAxiosRequestConfig) => {
//     const token = sessionStorage.getItem('_token');
//     if(token && request.headers){
//         request.headers.Authorization = `${token}`;
//     }
//     return request;
// });

// axiosClient.interceptors.response.use(async (response: AxiosResponse) => {
//     if(response.data){
//         return response.data;
//     }

//     return response;
// }, (error) => {
//     if(error.response?.status === 401){
//         sessionStorage.clear();
//         window.location.href = '/login';
//     }
//     throw error;
// });

// export default axiosClient;

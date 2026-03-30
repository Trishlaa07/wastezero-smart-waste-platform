import axios from "axios";

const API = "http://localhost:5001/api/messages";

export const getMessages = (userId,token)=>{
return axios.get(`${API}/${userId}`,{
headers:{
Authorization:`Bearer ${token}`
}
});
};

export const sendMessage = (data,token)=>{
return axios.post(`${API}/send`,data,{
headers:{
Authorization:`Bearer ${token}`
}
});
};
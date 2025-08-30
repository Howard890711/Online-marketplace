import { Navigate,Outlet } from "react-router-dom"
import { useUser } from "../UserContext"

export default function ProtectedRoute() {
    const {userData,loading}=useUser()
    if(loading) return<div>Loading...</div>
    if(!userData){
        return <Navigate to="/LoginForm" replace/>//replace為取代當前紀錄 不要再上一頁還能返回
    }


  return <Outlet/>;
}

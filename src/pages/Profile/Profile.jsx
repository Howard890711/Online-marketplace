import style from "./Profile.module.css";
import MyAccount from "../../components/MyAccount"
import ChangePassword from "../../components/ChangePassword";
import ShoppingHistory from "../../components/ShoppingHistory";
import {  useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function Profile() {


    const {section}=useParams();
    const [currentComponent,setCurrentComponent]=useState(section)
    const navigate=useNavigate()

    let renderComponent

    switch(currentComponent){
        case "MyAccount":
            renderComponent= <MyAccount/>
            break;
        case "ChangePassword":
            renderComponent= <ChangePassword/>
            break;
        case "ShoppingHistory":
            renderComponent= <ShoppingHistory/>
            break;
        default:
            renderComponent= <MyAccount/>
            break;
    }

    useEffect(()=>{
        setCurrentComponent(section)
    },[section])



  return (
    <div className={style.profilePage}>
      <div className=" d-flex flex-column gap-3">
        <h2>我的帳戶</h2>
        <button className={style.pageBtn} onClick={()=>navigate("/Profile/MyAccount")}>個人資料</button>
        <button className={style.pageBtn} onClick={()=>navigate("/Profile/ChangePassword")}>修改密碼</button>
        <button className={style.pageBtn} onClick={()=>navigate("/Profile/ShoppingHistory")}>購買清單</button>
      </div>
      <div className="bg-white p-3 flex-grow-1">
        {renderComponent}
      </div>
      
    </div>
    
  
  );
}

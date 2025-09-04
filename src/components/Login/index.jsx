import { signInWithEmailAndPassword } from "firebase/auth";
import "./index.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {auth} from "../../utils/firebase"
import swal from "sweetalert";

export default function Login({setFormMode}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate=useNavigate()
  let errorMsg=""


  const handleLogin = async(e) => {
    e.preventDefault();
    try{
      await signInWithEmailAndPassword(auth,email,password)
      navigate('/')

    }catch(error){
      switch(error.code){
        case "auth/user-not-found":
          errorMsg="此帳號不存在";
          break;
        case "auth/wrong-password":
          errorMsg="密碼錯誤";
          break;
        case "auth/invalid-email":
          errorMsg="Email 格式不正確";
          break;
        case"auth/invalid-credential":
          errorMsg="帳號或密碼錯誤"
          break;
        default:
          errorMsg="登入失敗，請稍後再試";
      }
      swal({
        title:errorMsg,
        icon: "error",
        button: true,
        dangerMode: true,
      });
    }
  };

  const handleEmail = (e) => {
    setEmail(e.target.value);
  };

  const handlePassword = (e) => {
    setPassword(e.target.value);
  };


  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };


  return (
    <div className="loginContainer bg-white">
      <div className="text-center mb-5">
        <img src="/images/icons/login_logo.png" className="logoIcon" alt="logoIcon"/>
      </div>
      <form onSubmit={handleLogin} className="d-flex flex-column gap-4">
        <div>
          <label htmlFor="email" className="form-label">
            帳號/Email
          </label>
          <input
            type="email"
            className="form-control"
            id="email"
            placeholder="請輸入email"
            value={email}
            onChange={handleEmail}
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="form-label">
            密碼
          </label>
          <div className="position-relative">
          <input
            type={showPassword?"text":"password"}
            className="form-control"
            id="password"
            placeholder="請輸入密碼"
            minLength={6}
            maxLength={20}
            value={password}
            onChange={handlePassword}
            required
          />
          <button
              type="button"
              className="btn btn-outline-secondary position-absolute 
              translate-middle-y top-50 end-0 border-0 buttonNoHover"
              onClick={toggleShowPassword}
            >
              {showPassword ? (
                <img src="./images/icons/openEyes.png" className="eyes" alt="openEyes"/>
              ) : (
                <img src="./images/icons/closeEyes.png" className="eyes" alt="closeEyes"/>
              )}
            </button>
        </div>
        </div>
        <div className="text-center ">
          <button
            type="submit"
            className="btn form-control text-white mt-3 "
            style={{ backgroundColor: "#ffa042" }}
          >
            登入  
          </button>
        </div>
      </form>

      <div className="mt-3 text-center text-secondary">
        金桔新朋友?
        <span className="registerLink" onClick={()=>{setFormMode('register')}}>
          註冊
        </span>
      </div>
    </div>
  );
}

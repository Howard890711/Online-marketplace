import { useState } from "react";
import "./index.css";
import { auth,db } from "../../utils/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import swal from "sweetalert";

export default function Register({ setFormMode }) {
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [checkRegisterPassword, setCheckRegisterPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCheckPassword, setShowCheckPassword] = useState(false);
  let errorMsg="";

  const handleRegister = async (e) => {
    e.preventDefault();
    if (registerPassword !== checkRegisterPassword) {
      swal({
        title:"密碼不一致",
        icon:"error",
        button:true,
        dangerMode:true
      })
      setCheckRegisterPassword("");
      return;
    }
    try {
      const userCredential= await createUserWithEmailAndPassword(
        auth,
        registerEmail,
        registerPassword
      );
      const user=userCredential.user;
      const uid=user.uid;
      const now=Timestamp.now().toDate();
      now.setHours(0,0,0,0);

      await setDoc(doc(db,"users",uid),{
        name:"",
        email:registerEmail,
        phoneNumber:"",
        gender:"",
        userImg:"",
        birthDayDate:Timestamp.fromDate(now)
      })

      swal({
        title: "註冊成功",
        icon: "success",
        button: true,
        dangerMode: false,
      });
      setTimeout(()=>{
        setFormMode('login')
      },2000)
      
    } catch (error) {
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMsg="此 Email 已被註冊";
          break;
        case "auth/invalid-email":
          errorMsg="Email 格式不正確";
          break;
        case "auth/weak-password":
          errorMsg="密碼強度不足，請至少輸入 6 位數";
          break;
        default:
          errorMsg="註冊失敗，請稍後再試";
      }
       swal({
        title: errorMsg,
        icon: "error",
        button: true,
        dangerMode: true,
      });
      setCheckRegisterPassword('')
    }

  };


  return (
    <div className="p-5 bg-white">
      <div className="text-center mb-5">
        <h1>會員註冊</h1>
      </div>

      <form onSubmit={handleRegister} className="d-flex flex-column gap-4">
        <div>
          <label htmlFor="registerEmail">帳號</label>
          <input
            id="registerEmail"
            className="form-control"
            type="email"
            placeholder="請輸入Email"
            value={registerEmail}
            onChange={(e)=>setRegisterEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="registerPassword">密碼</label>
          <div className="position-relative">
            <input
              id="registerPassword"
              className="form-control"
              type={showPassword ? "text" : "password"}
              placeholder="請輸入密碼"
              minLength={6}
              maxLength={20}
              value={registerPassword}
              onChange={(e)=>{setRegisterPassword(e.target.value)}}
              required
            />
            <button
              type="button"
              className="btn btn-outline-secondary position-absolute 
              translate-middle-y top-50 end-0 border-0 buttonNoHover"
              onClick={()=>setShowPassword(prev=>!prev)}
            >
              {showPassword ? (
                <img src="/images/icons/openEyes.png" className="eyes" alt="openEyes"/>
              ) : (
                <img src="/images/icons/closeEyes.png" className="eyes" alt="closeEyes"/>
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="registerEmail">確認密碼</label>
          <div className="position-relative">
            <input
              id="checkRegisterPassword"
              className="form-control"
              type={showCheckPassword ? "text" : "password"}
              placeholder="請再次確認密碼"
              minLength={6}
              maxLength={20}
              value={checkRegisterPassword}
              onChange={(e)=>setCheckRegisterPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="btn btn-outline-secondary position-absolute 
              translate-middle-y top-50 end-0 border-0 buttonNoHover"
              onClick={()=>setShowCheckPassword(prev=>!prev)}
            >
              {showCheckPassword ? (
                <img src="/images/icons/openEyes.png" className="eyes" alt="openEyes"/>
              ) : (
                <img src="/images/icons/closeEyes.png" className="eyes" alt="closeEyes"/>
              )}
            </button>
          </div>
        </div>
        <button
          type="submit"
          className="btn form-control text-white mt-3"
          style={{ backgroundColor: "#ffa042" }}
        >
          註冊
        </button>
      </form>


      <div className="text-center mt-3 text-secondary">
        已經有帳號了嗎？
        <span
          className="loginLink"
          onClick={() => {
            setFormMode("login");
          }}
        >
          登入
        </span>
      </div>
    </div>
  );
}

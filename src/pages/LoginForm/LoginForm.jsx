import { useState } from "react";
import style from "./LoginForm.module.css";
import Login from "../../components/Login";
import Register from "../../components/Register";

export default function LoginForm() {
  const [formMode, setFormMode] = useState("login");

  return (
    <div className={style.loginFormPage}>
      <div className={style.loginFormBox}>
        {formMode === "login" ? (
          <Login setFormMode={setFormMode} />
        ) : (
          <Register setFormMode={setFormMode} />
        )}
      </div>
    </div>
  );
}

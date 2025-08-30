import { auth } from "../../utils/firebase";
import {
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import swal from "sweetalert";
import "./index.css";
import { useState } from "react";

export default function ChangePassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChangePassword = (e) => {
    const { value, name } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const onSubmitChangePassword = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      e.stopPropagation();
      form.classList.add("was-validated");
      return;
    }
    const user = auth.currentUser;

    const { oldPassword, newPassword, confirmPassword } = formData;
    setIsLoading(true);
    if (newPassword !== confirmPassword) {
      swal({
        title: "新密碼與確認密碼不一致",
        icon: "warning",
        button: true,
        dangerMode: true,
      });
      form.classList.remove("was-balidated")
      setIsLoading(false)
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword); //類似手動登入取得憑證
      await reauthenticateWithCredential(user, credential); //驗證使用者身份
      await updatePassword(user, confirmPassword);
      swal({
        title: "更改成功",
        icon: "success",
        button: true,
        dangerMode: false,
      });
    } catch (err) {
      let errorMsg = "更改失敗";
      if (err.code === "auth/wrong-password") errorMsg = "舊密碼錯誤";
      else if (err.code === "auth/weak-password") errorMsg = "密碼太簡單";
      swal({ title: errorMsg, icon: "error",button:true,dangerMode:true });
      console.error("更新失敗", err);
    } finally {
      setFormData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      form.classList.remove("was-validated");
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="ms-4">更改密碼</h2>
      <hr />
      <div className="changePasswordPadding">
        <form
          className="d-flex flex-column gap-3 col-auto"
          onSubmit={onSubmitChangePassword}
          noValidate
        >
          <div className="row d-flex align-items-center mb-3">
            <label
              htmlFor="oldPassword"
              className="col-2 text-end fw-bold me-2"
            >
              舊密碼
            </label>
            <input
              type="password"
              className="col form-control"
              name="oldPassword"
              id="oldPassword"
              value={formData.oldPassword}
              placeholder="請輸入舊的密碼"
              onChange={handleChangePassword}
              required
            />
          </div>
          <div className="row d-flex align-items-center mb-3">
            <label
              htmlFor="newPassword"
              className="col-2 text-end fw-bold me-2"
            >
              新密碼
            </label>
            <div className="col position-relative p-0">
              <input
                type={showNewPassword ? "text" : "password"}
                className="form-control"
                name="newPassword"
                id="newPassword"
                value={formData.newPassword}
                placeholder="請輸入新的密碼"
                onChange={handleChangePassword}
                minLength={6}
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary position-absolute 
              translate-middle-y top-50 end-0 border-0 buttonNoHover"
                onClick={() => setShowNewPassword((prev) => !prev)}
              >
                {showNewPassword ? (
                  <img src="/images/icons/openEyes.png" className="eyes" />
                ) : (
                  <img src="/images/icons/closeEyes.png" className="eyes" />
                )}
              </button>
            </div>
          </div>
          <div className="row d-flex align-items-center mb-3">
            <label
              htmlFor="confirmPassword"
              className="col-2 text-end fw-bold me-2"
            >
              確認密碼
            </label>
            <div className="position-relative col p-0">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="form-control"
                name="confirmPassword"
                id="confirmPassword"
                value={formData.confirmPassword}
                placeholder="請再次輸入新密碼"
                onChange={handleChangePassword}
                minLength={6}
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary position-absolute 
              translate-middle-y top-50 end-0 border-0 buttonNoHover"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? (
                  <img src="/images/icons/openEyes.png" className="eyes" />
                ) : (
                  <img src="/images/icons/closeEyes.png" className="eyes" />
                )}
              </button>
            </div>
          </div>

          <div className="row d-flex align-items-center">
            <div className="col-2 text-end fw-bold me-2"></div>
            <div className="col">
              <button
                type="submit"
                className="passWordBtn border-0 p-2 rounded "
              >
                {isLoading ? (
                  <div className="text-center">
                    <div className="spinner-border spinner-border-sm text-warning" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-white">儲存</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
